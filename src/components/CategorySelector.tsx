import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getActiveCategories } from '../lib/categoryService';
import type { Category } from '../lib/types';
import { cn } from '../lib/utils';
import * as LucideIcons from 'lucide-react';
import toast from 'react-hot-toast';

interface CategorySelectorProps {
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
  disabled?: boolean;
  maxSelections?: number;
}

const CategorySelector = ({ 
  selectedCategories, 
  onChange, 
  disabled = false,
  maxSelections 
}: CategorySelectorProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await getActiveCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCategory = (categoryId: string) => {
    if (disabled) return;

    if (selectedCategories.includes(categoryId)) {
      // Remove category
      onChange(selectedCategories.filter(id => id !== categoryId));
    } else {
      // Add category
      if (maxSelections && selectedCategories.length >= maxSelections) {
        toast.error(`Maximum ${maxSelections} categories allowed`);
        return;
      }
      onChange([...selectedCategories, categoryId]);
    }
  };

  const handleRemoveCategory = (categoryId: string) => {
    onChange(selectedCategories.filter(id => id !== categoryId));
  };

  const selectedCategoryObjects = categories.filter(cat => selectedCategories.includes(cat.id));
  const availableCategories = categories.filter(cat => !selectedCategories.includes(cat.id));

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Selected Categories */}
      {selectedCategoryObjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCategoryObjects.map(category => (
            <CategoryBadge
              key={category.id}
              category={category}
              onRemove={disabled ? undefined : () => handleRemoveCategory(category.id)}
            />
          ))}
        </div>
      )}

      {/* Dropdown Trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={disabled}
          className={cn(
            "w-full px-4 py-2 border border-gray-300 rounded-lg text-left",
            "hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            "disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
          )}
        >
          {selectedCategories.length === 0 ? (
            <span className="text-gray-500">Select categories...</span>
          ) : (
            <span className="text-gray-700">
              {selectedCategories.length} categor{selectedCategories.length === 1 ? 'y' : 'ies'} selected
            </span>
          )}
        </button>

        {/* Dropdown Menu */}
        {showDropdown && availableCategories.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {availableCategories.map(category => (
              <button
                key={category.id}
                type="button"
                onClick={() => {
                  handleToggleCategory(category.id);
                  setShowDropdown(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <CategoryIcon icon={category.icon} color={category.color} size={16} />
                <span className="text-sm font-medium">{category.name}</span>
              </button>
            ))}
          </div>
        )}

        {showDropdown && availableCategories.length === 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-sm text-gray-500">
            All categories selected
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}

      {maxSelections && (
        <p className="text-xs text-gray-500">
          Maximum {maxSelections} categories can be selected
        </p>
      )}
    </div>
  );
};

// Category Badge Component
export const CategoryBadge = ({ 
  category, 
  onRemove, 
  size = 'md' 
}: { 
  category: Category; 
  onRemove?: () => void;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const iconSize = {
    sm: 12,
    md: 14,
    lg: 16
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        sizeClasses[size]
      )}
      style={{ 
        backgroundColor: `${category.color}15`,
        color: category.color,
        border: `1px solid ${category.color}40`
      }}
    >
      <CategoryIcon icon={category.icon} color={category.color} size={iconSize[size]} />
      <span>{category.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
          aria-label="Remove category"
        >
          <X size={iconSize[size]} />
        </button>
      )}
    </span>
  );
};

// Category Icon Component
export const CategoryIcon = ({ 
  icon, 
  color, 
  size = 16 
}: { 
  icon: string; 
  color: string; 
  size?: number;
}) => {
  // Get icon component from Lucide
  const IconComponent = (LucideIcons as any)[icon];
  
  if (!IconComponent) {
    // Fallback to a default icon if not found
    return <LucideIcons.Tag size={size} style={{ color }} />;
  }

  return <IconComponent size={size} style={{ color }} />;
};

export default CategorySelector;
