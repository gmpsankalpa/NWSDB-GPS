/**
 * Firestore Error Handler
 * Centralized error handling for Firestore operations
 */

import toast from 'react-hot-toast';

interface FirestoreError extends Error {
  code?: string;
  message: string;
}

let indexErrorShown = false; // Prevent duplicate notifications

/**
 * Handle Firestore errors with user-friendly messages
 */
export const handleFirestoreError = (
  error: FirestoreError,
  context: string = 'Firestore operation'
): void => {
  console.error(`${context}:`, error);

  // Missing index error
  if (error.code === 'failed-precondition' || error.message?.includes('index')) {
    if (!indexErrorShown) {
      indexErrorShown = true;
      console.warn(
        `⚠️ Missing Firestore index detected. ${context} will continue with limited real-time updates.`
      );
      
      // Only show user notification in production
      if (process.env.NODE_ENV === 'production') {
        toast.error(
          'Some real-time features are temporarily limited. Please refresh the page.',
          {
            duration: 5000,
            icon: '⚠️',
          }
        );
      }
    }
    return;
  }

  // Permission denied
  if (error.code === 'permission-denied') {
    toast.error('You don\'t have permission to access this data.', {
      duration: 4000,
      icon: '🔒',
    });
    return;
  }

  // Unavailable (network issue)
  if (error.code === 'unavailable') {
    toast.error('Connection lost. Please check your internet.', {
      duration: 5000,
      icon: '📡',
    });
    return;
  }

  // Not found
  if (error.code === 'not-found') {
    toast.error('The requested data could not be found.', {
      duration: 4000,
      icon: '🔍',
    });
    return;
  }

  // Already exists
  if (error.code === 'already-exists') {
    toast.error('This record already exists.', {
      duration: 4000,
      icon: 'ℹ️',
    });
    return;
  }

  // Deadline exceeded (timeout)
  if (error.code === 'deadline-exceeded') {
    toast.error('Request timed out. Please try again.', {
      duration: 4000,
      icon: '⏱️',
    });
    return;
  }

  // Resource exhausted (quota)
  if (error.code === 'resource-exhausted') {
    toast.error('Service temporarily unavailable. Please try again later.', {
      duration: 5000,
      icon: '⚠️',
    });
    return;
  }

  // Cancelled
  if (error.code === 'cancelled') {
    // Don't show toast for cancelled operations (user-initiated)
    console.log('Operation cancelled');
    return;
  }

  // Unknown/Generic error - only show in development
  if (process.env.NODE_ENV === 'development') {
    toast.error(`Error: ${error.message}`, {
      duration: 4000,
      icon: '❌',
    });
  } else {
    // In production, show generic message
    toast.error('An error occurred. Please try again.', {
      duration: 4000,
      icon: '❌',
    });
  }
};

/**
 * Wrap Firestore queries with error handling
 */
export const safeFirestoreQuery = async <T>(
  queryFn: () => Promise<T>,
  context: string = 'Query'
): Promise<T | null> => {
  try {
    return await queryFn();
  } catch (error) {
    handleFirestoreError(error as FirestoreError, context);
    return null;
  }
};

/**
 * Create error handler for onSnapshot listeners
 */
export const createSnapshotErrorHandler = (context: string) => {
  return (error: FirestoreError) => {
    handleFirestoreError(error, context);
  };
};

/**
 * Reset the index error flag (useful for testing or when user refreshes)
 */
export const resetIndexErrorFlag = () => {
  indexErrorShown = false;
};
