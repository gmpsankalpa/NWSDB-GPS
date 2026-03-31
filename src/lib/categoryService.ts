import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_CATEGORIES } from './types';
import type { Category, CategoryFormData } from './types';

// ===========================
// CATEGORY CRUD OPERATIONS
// ===========================

/**
 * Get all categories from Firestore
 */
export const getAllCategories = async (): Promise<Category[]> => {
  try {
    const q = query(
      collection(db, 'categories'),
      orderBy('order', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Category[];
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

/**
 * Get active categories only
 */
export const getActiveCategories = async (): Promise<Category[]> => {
  try {
    const q = query(
      collection(db, 'categories'),
      where('active', '==', true),
      orderBy('order', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Category[];
  } catch (error) {
    console.error('Error fetching active categories:', error);
    throw error;
  }
};

/**
 * Get category by ID
 */
export const getCategoryById = async (id: string): Promise<Category | null> => {
  try {
    const docRef = doc(db, 'categories', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Category;
    }
    return null;
  } catch (error) {
    console.error('Error fetching category:', error);
    throw error;
  }
};

/**
 * Create a new category
 */
export const createCategory = async (
  categoryData: CategoryFormData,
  userId: string
): Promise<string> => {
  try {
    // Get the highest order number
    const categories = await getAllCategories();
    const maxOrder = categories.length > 0 
      ? Math.max(...categories.map(c => c.order))
      : 0;

    const newCategory = {
      ...categoryData,
      order: maxOrder + 1,
      createdAt: Timestamp.now(),
      createdBy: userId,
    };

    const docRef = await addDoc(collection(db, 'categories'), newCategory);
    return docRef.id;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

/**
 * Update an existing category
 */
export const updateCategory = async (
  id: string,
  categoryData: Partial<CategoryFormData>,
  userId: string
): Promise<void> => {
  try {
    const docRef = doc(db, 'categories', id);
    await updateDoc(docRef, {
      ...categoryData,
      lastUpdated: Timestamp.now(),
      lastUpdatedBy: userId,
    });
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

/**
 * Delete a category
 */
export const deleteCategory = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'categories', id));
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

/**
 * Reorder categories
 */
export const reorderCategories = async (categoryIds: string[]): Promise<void> => {
  try {
    const updatePromises = categoryIds.map((id, index) =>
      updateDoc(doc(db, 'categories', id), { order: index + 1 })
    );
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error reordering categories:', error);
    throw error;
  }
};

/**
 * Check if categories collection exists and seed default categories if empty
 */
export const seedDefaultCategories = async (userId: string): Promise<void> => {
  try {
    const categories = await getAllCategories();
    
    // Only seed if no categories exist
    if (categories.length === 0) {
      console.log('Seeding default categories...');
      
      const promises = DEFAULT_CATEGORIES.map(category =>
        addDoc(collection(db, 'categories'), {
          ...category,
          createdAt: Timestamp.now(),
          createdBy: userId,
        })
      );
      
      await Promise.all(promises);
      console.log('Default categories seeded successfully');
    }
  } catch (error) {
    console.error('Error seeding default categories:', error);
    throw error;
  }
};

/**
 * Get categories by IDs
 */
export const getCategoriesByIds = async (ids: string[]): Promise<Category[]> => {
  if (!ids || ids.length === 0) return [];
  
  try {
    const promises = ids.map(id => getCategoryById(id));
    const categories = await Promise.all(promises);
    return categories.filter(c => c !== null) as Category[];
  } catch (error) {
    console.error('Error fetching categories by IDs:', error);
    return [];
  }
};

/**
 * Check if category name already exists
 */
export const categoryNameExists = async (name: string, excludeId?: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, 'categories'),
      where('name', '==', name)
    );
    const snapshot = await getDocs(q);
    
    if (excludeId) {
      // Exclude the current category being edited
      return snapshot.docs.some(doc => doc.id !== excludeId);
    }
    
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking category name:', error);
    return false;
  }
};
