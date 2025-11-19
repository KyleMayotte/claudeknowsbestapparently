// Authentication hook
// Provides authentication state and methods using Firebase

import { useState, useEffect } from 'react';
// FIREBASE REMOVED - Mock implementation
// import { getIdToken } from '@react-native-firebase/auth';
import authService from '../services/auth';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to Firebase auth state changes
  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    // Set a timeout to prevent infinite loading state
    timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('Auth initialization timeout - setting loading to false');
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    try {
      const unsubscribe = authService.onAuthStateChanged(async (authUser) => {
        if (!isMounted) return;

        try {
          if (authUser) {
            // Convert Firebase user to app User format
            const appUser: User = {
              id: authUser.uid,
              email: authUser.email || '',
              name: authUser.displayName || '',
            };
            setUser(appUser);

            // Get Firebase ID token for API calls
            try {
              // FIREBASE REMOVED - Mock token
              const idToken = 'mock_token_' + authUser.uid;
              if (isMounted) {
                setToken(idToken);
              }
            } catch (err) {
              console.error('Failed to get ID token:', err);
              if (isMounted) {
                setError('Failed to authenticate');
              }
            }
          } else {
            setUser(null);
            setToken(null);
          }
        } catch (err) {
          console.error('Error in auth state change handler:', err);
          if (isMounted) {
            setError('Authentication error occurred');
          }
        } finally {
          if (isMounted) {
            setLoading(false);
            clearTimeout(timeoutId);
          }
        }
      });

      return () => {
        isMounted = false;
        clearTimeout(timeoutId);
        unsubscribe();
      };
    } catch (err) {
      console.error('Failed to initialize auth listener:', err);
      if (isMounted) {
        setLoading(false);
        setError('Failed to initialize authentication');
      }
      clearTimeout(timeoutId);
      return () => {
        isMounted = false;
      };
    }
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      setError(null);

      await authService.signIn(credentials.email, credentials.password);
      // User state will be updated automatically by onAuthStateChanged
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setLoading(true);
      setError(null);

      const credential = await authService.signUp(data.email, data.password, data.name);
      // User state will be updated automatically by onAuthStateChanged

      return { userId: credential.user?.uid || '' };
    } catch (err: any) {
      const errorMessage = err.message || 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authService.signOut();
      // User state will be cleared automatically by onAuthStateChanged
    } catch (err) {
      console.error('Logout error:', err);
      setError('Logout failed');
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!user && !!token,
    login,
    register,
    logout,
  };
};
