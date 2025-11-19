// FIREBASE REMOVED - Mock implementation
import { Alert } from 'react-native';

/**
 * Check if error is a network error
 */
export const isNetworkError = (error: any): boolean => {
  const errorCode = error?.code || '';
  const errorMessage = error?.message?.toLowerCase() || '';

  return (
    errorCode.includes('network') ||
    errorCode.includes('unavailable') ||
    errorCode.includes('timeout') ||
    errorMessage.includes('network') ||
    errorMessage.includes('offline') ||
    errorMessage.includes('internet') ||
    errorMessage.includes('connection')
  );
};

/**
 * Get a user-friendly error message (generic version)
 */
export const getFirebaseErrorMessage = (error: any): string => {
  const errorMessage = error?.message || '';

  // Generic error handling (Firebase-specific logic removed)
  if (errorMessage.includes('network') || errorMessage.includes('unavailable')) {
    return 'Network error. Check your internet connection.';
  }

  if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
    return 'Access denied. Please check your permissions.';
  }

  if (errorMessage.includes('not found')) {
    return 'Data not found.';
  }

  if (errorMessage.includes('already exists')) {
    return 'This item already exists.';
  }

  if (errorMessage.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }

  // If we have a message, return it
  if (errorMessage) {
    return errorMessage;
  }

  // Default fallback
  return 'Something went wrong. Please try again.';
};

/**
 * Show an error alert with optional retry button
 */
export const showErrorAlert = (
  title: string,
  error: any,
  onRetry?: () => void | Promise<void>
) => {
  const networkError = isNetworkError(error);
  const errorMessage = getFirebaseErrorMessage(error);

  let message = errorMessage;

  if (networkError) {
    message = 'No internet connection. Your data is saved locally and will sync when you\'re back online.';
  }

  const buttons: any[] = [];

  if (onRetry) {
    buttons.push({
      text: 'Retry',
      onPress: onRetry,
    });
  }

  buttons.push({
    text: onRetry ? 'Cancel' : 'OK',
    style: 'cancel',
  });

  Alert.alert(title, message, buttons);
};

/**
 * Show a success alert
 */
export const showSuccessAlert = (title: string, message: string) => {
  Alert.alert(title, message, [{ text: 'OK' }]);
};

/**
 * Show an offline mode alert
 */
export const showOfflineAlert = () => {
  Alert.alert(
    'Offline Mode',
    'You\'re currently offline. Your data is saved locally and will sync when you reconnect.',
    [{ text: 'OK' }]
  );
};
