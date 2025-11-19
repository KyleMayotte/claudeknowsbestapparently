// FIREBASE REMOVED - Mock implementation
// import {
//   type FirebaseAuthTypes,
//   createUserWithEmailAndPassword,
//   signInWithEmailAndPassword,
//   signOut as firebaseSignOut,
//   sendPasswordResetEmail as firebaseSendPasswordResetEmail,
//   updateProfile as firebaseUpdateProfile,
//   updateEmail as firebaseUpdateEmail,
//   updatePassword as firebaseUpdatePassword,
//   reauthenticateWithCredential,
//   EmailAuthProvider,
//   onAuthStateChanged as firebaseOnAuthStateChanged,
// } from '@react-native-firebase/auth';
import { auth } from '../config/firebase';

// Mock FirebaseAuthTypes
export namespace FirebaseAuthTypes {
  export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  }

  export interface UserCredential {
    user: User;
  }
}

export interface AuthUser {
  uid: string;
  id?: string; // Alias for uid (for compatibility)
  email: string | null;
  displayName: string | null;
  name?: string;
  photoURL: string | null;
}

// Type aliases for backward compatibility
export type User = AuthUser;

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName?: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

class AuthService {
  // Sign up with email and password
  async signUp(email: string, password: string, displayName?: string): Promise<FirebaseAuthTypes.UserCredential> {
    try {
      // Mock user credential
      const mockUser: FirebaseAuthTypes.User = {
        uid: 'mock-user-' + Date.now(),
        email,
        displayName: displayName || null,
        photoURL: null,
      };

      return {
        user: mockUser,
      };
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<FirebaseAuthTypes.UserCredential> {
    try {
      // Mock user credential
      const mockUser: FirebaseAuthTypes.User = {
        uid: 'mock-user-' + Date.now(),
        email,
        displayName: 'Mock User',
        photoURL: null,
      };

      return {
        user: mockUser,
      };
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      // Mock sign out - do nothing
      auth.currentUser = null;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Get current user
  getCurrentUser(): FirebaseAuthTypes.User | null {
    return auth.currentUser;
  }

  // Send password reset email
  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      // Mock - do nothing
      console.log('Mock: Password reset email would be sent to', email);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Update user profile
  async updateProfile(updates: { displayName?: string; photoURL?: string }): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user is currently signed in');
      }
      // Mock - do nothing
      console.log('Mock: Profile would be updated', updates);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Update email
  async updateEmail(newEmail: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user is currently signed in');
      }
      // Mock - do nothing
      console.log('Mock: Email would be updated to', newEmail);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Update password
  async updatePassword(newPassword: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user is currently signed in');
      }
      // Mock - do nothing
      console.log('Mock: Password would be updated');
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Re-authenticate user (required before sensitive operations)
  async reauthenticate(password: string): Promise<FirebaseAuthTypes.UserCredential> {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('No user is currently signed in');
      }
      // Mock - return current user as credential
      return {
        user,
      };
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Handle authentication errors
  private handleAuthError(error: any): Error {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return new Error('This email address is already in use');
      case 'auth/invalid-email':
        return new Error('Invalid email address');
      case 'auth/operation-not-allowed':
        return new Error('Email/password accounts are not enabled');
      case 'auth/weak-password':
        return new Error('Password is too weak. Please use a stronger password');
      case 'auth/user-disabled':
        return new Error('This account has been disabled');
      case 'auth/user-not-found':
        return new Error('No account found with this email');
      case 'auth/wrong-password':
        return new Error('Incorrect password');
      case 'auth/invalid-credential':
        return new Error('Invalid email or password');
      case 'auth/network-request-failed':
        return new Error('Network error. Please check your connection');
      case 'auth/too-many-requests':
        return new Error('Too many attempts. Please try again later');
      default:
        return new Error(error.message || 'An authentication error occurred');
    }
  }

  // Auth state change listener
  onAuthStateChanged(callback: (user: FirebaseAuthTypes.User | null) => void): () => void {
    // Mock - call callback immediately with null and return noop unsubscribe
    callback(auth.currentUser);
    return () => {};
  }
}

export default new AuthService();
