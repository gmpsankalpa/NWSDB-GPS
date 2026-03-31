import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, Loader2, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { 
  getAllCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory,
  reorderCategories,
  categoryNameExists,
  seedDefaultCategories 
} from '../lib/categoryService';
import type { Category, CategoryFormData } from '../lib/types';
import { CategoryBadge } from '../components/CategorySelector';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ROLES } from '../lib/offices';

// Popular icon options for categories
const ICON_OPTIONS = [
  'Home', 'Building', 'Factory', 'Landmark', 'School', 'Hospital',
  'Droplets', 'Gauge', 'Wrench', 'AlertTriangle', 'Plus', 'Clock',
  'Tag', 'MapPin', 'Zap', 'Flame', 'Sprout', 'Store',
  'Building2', 'Warehouse', 'Briefcase', 'ShoppingCart'
];

// Color options
const COLOR_OPTIONS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Green', value: '#10B981' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Lime', value: '#84CC16' },
  { name: 'Gray', value: '#64748B' }
];

const CategoryManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    icon: 'Tag',
    color: '#3B82F6',
    description: '',
    active: true
  });

  // Check permissions
  useEffect(() => {
    if (user && user.role !== ROLES.REGIONAL_ENGINEER && user.role !== ROLES.DEVELOPER) {
      toast.error('Unauthorized access');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await getAllCategories();
      setCategories(cats);
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDefaults = async () => {
    if (!user) return;
    
    if (!confirm('This will add default categories. Continue?')) return;
    
    setSeeding(true);
    try {
      await seedDefaultCategories(user.email);
      await loadCategories();
      toast.success('Default categories added successfully!');
    } catch (error) {
      toast.error('Failed to seed categories');
    } finally {
      setSeeding(false);
    }
  };

  const handleOpenForm = (category?: Category) => {
    if (category) {
      setEditingId(category.id);
      setFormData({
        name: category.name,
        icon: category.icon,
        color: category.color,
        description: category.description || '',
        active: category.active
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        icon: 'Tag',
        color: '#3B82F6',
        description: '',
        active: true
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate name
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    // Check for duplicate name
    const nameExists = await categoryNameExists(formData.name, editingId || undefined);
    if (nameExists) {
      toast.error('A category with this name already exists');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateCategory(editingId, formData, user.email);
        toast.success('Category updated successfully!');
      } else {
        await createCategory(formData, user.email);
        toast.success('Category created successfully!');
      }
      await loadCategories();
      handleCloseForm();
    } catch (error) {
      toast.error('Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? This action cannot be undone.`)) return;

    try {
      await deleteCategory(id);
      await loadCategories();
      toast.success('Category deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newOrder = [...categories];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    await saveOrder(newOrder);
  };

  const handleMoveDown = async (index: number) => {
    if (index === categories.length - 1) return;
    const newOrder = [...categories];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    await saveOrder(newOrder);
  };

  const saveOrder = async (newOrder: Category[]) => {
    try {
      const ids = newOrder.map(c => c.id);
      await reorderCategories(ids);
      setCategories(newOrder);
      toast.success('Order updated!');
    } catch (error) {
      toast.error('Failed to update order');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Category Management</h1>
            <p className="text-gray-600 mt-1">Manage connection categories and tags</p>
          </div>
          <div className="grid grid-cols-1 sm:flex gap-2 w-full sm:w-auto">
            {categories.length === 0 && (
              <button
                onClick={handleSeedDefaults}
                disabled={seeding}
                className="w-full sm:w-auto px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {seeding && <Loader2 className="w-4 h-4 animate-spin" />}
                Seed Defaults
              </button>
            )}
            <button
              onClick={() => handleOpenForm()}
              className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Category
            </button>
          </div>
        </div>

        {/* Categories List */}
        {categories.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">No categories yet</p>
            <button
              onClick={handleSeedDefaults}
              disabled={seeding}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 inline-flex items-center gap-2"
            >
              {seeding && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Default Categories
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map((category, index) => (
              <div
                key={category.id}
                className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:shadow-md transition-shadow"
              >
                {/* Reorder Buttons */}
                <div className="flex sm:flex-col gap-1 self-start sm:self-center">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === categories.length - 1}
                    className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Category Display */}
                <div className="flex-1 min-w-0">
                  <CategoryBadge category={category} size="lg" />
                  {category.description && (
                    <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                  )}
                </div>

                <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3">
                  {/* Status */}
                  <span
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium",
                      category.active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    )}
                  >
                    {category.active ? 'Active' : 'Inactive'}
                  </span>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenForm(category)}
                      className="p-2.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id, category.name)}
                      className="p-2.5 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[92vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-bold">
                    {editingId ? 'Edit Category' : 'Add New Category'}
                  </h2>
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 sm:p-6 space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Residential Connection"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* Icon */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Icon <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                      {ICON_OPTIONS.map(icon => {
                        const IconComponent = (LucideIcons as any)[icon];
                        return (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => setFormData({ ...formData, icon })}
                            className={cn(
                              "p-3 border rounded-lg hover:bg-gray-50 transition-colors",
                              formData.icon === icon
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-300"
                            )}
                            title={icon}
                          >
                            <IconComponent className="w-5 h-5 mx-auto" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Color */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {COLOR_OPTIONS.map(color => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, color: color.value })}
                          className={cn(
                            "px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all",
                            formData.color === color.value
                              ? "border-gray-900 ring-2 ring-offset-2"
                              : "border-transparent"
                          )}
                          style={{ 
                            backgroundColor: color.value + '20',
                            color: color.value
                          }}
                        >
                          {color.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of this category..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Active Status */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="active"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label htmlFor="active" className="text-sm font-medium text-gray-700">
                      Active (visible to users)
                    </label>
                  </div>

                  {/* Preview */}
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                    <CategoryBadge
                      category={{
                        id: 'preview',
                        name: formData.name || 'Category Name',
                        icon: formData.icon,
                        color: formData.color,
                        active: formData.active,
                        order: 0,
                        createdAt: null as any,
                        createdBy: ''
                      }}
                      size="lg"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 sm:px-6 py-4 flex flex-col-reverse sm:flex-row justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Save className="w-4 h-4" />
                    {editingId ? 'Update' : 'Create'} Category
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CategoryManagement;
