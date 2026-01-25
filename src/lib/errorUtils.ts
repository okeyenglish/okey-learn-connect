/**
 * Utility functions for type-safe error handling
 */

/**
 * Safely extracts error message from an unknown error type
 * Works with Error instances, objects with message property, and strings
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (typeof error === 'object' && error !== null) {
    // Handle objects with message property
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }
    
    // Handle objects with details property (common in Supabase errors)
    if ('details' in error && typeof (error as { details: unknown }).details === 'string') {
      return (error as { details: string }).details;
    }
    
    // Handle objects with error property
    if ('error' in error && typeof (error as { error: unknown }).error === 'string') {
      return (error as { error: string }).error;
    }
  }
  
  return 'An unknown error occurred';
};

/**
 * Type guard to check if an error has a message property
 */
export const isErrorWithMessage = (error: unknown): error is { message: string } => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
};

/**
 * Type guard to check if an error has a code property (common in Supabase errors)
 */
export const isErrorWithCode = (error: unknown): error is { code: string } => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  );
};

/**
 * Safely handles an error in a catch block, logging it and returning a message
 */
export const handleError = (error: unknown, context: string): string => {
  const message = getErrorMessage(error);
  console.error(`[${context}]`, error);
  return message;
};
