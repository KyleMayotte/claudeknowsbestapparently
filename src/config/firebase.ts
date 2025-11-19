// FIREBASE REMOVED - Mock implementation
// import { getApp } from '@react-native-firebase/app';
// import { getAuth } from '@react-native-firebase/auth';
// import firestore from '@react-native-firebase/firestore';

// Firebase configuration
// Note: Native configuration files (google-services.json / GoogleService-Info.plist)
// initialize the default app instance. We obtain the modular Auth and Firestore instances
// here so the rest of the codebase can consume them.

// Mock auth object
const auth: any = {
  currentUser: null,
};

// Mock firestore function
const firestore = (): any => ({
  collection: () => ({
    doc: () => ({
      set: async () => {},
      get: async () => ({ exists: false, data: () => null }),
      delete: async () => {},
    }),
    where: () => ({
      where: () => ({
        limit: () => ({
          get: async () => ({ empty: true, docs: [] }),
        }),
        get: async () => ({ empty: true, docs: [] }),
      }),
      limit: () => ({
        get: async () => ({ empty: true, docs: [] }),
      }),
      orderBy: () => ({
        limit: () => ({
          get: async () => ({ empty: true, docs: [] }),
        }),
        get: async () => ({ empty: true, docs: [] }),
      }),
      get: async () => ({ empty: true, docs: [] }),
    }),
    orderBy: () => ({
      limit: () => ({
        get: async () => ({ empty: true, docs: [] }),
      }),
      get: async () => ({ empty: true, docs: [] }),
    }),
    get: async () => ({ empty: true, docs: [], forEach: () => {} }),
    add: async () => ({ id: 'mock-id' }),
    limit: () => ({
      get: async () => ({ empty: true, docs: [] }),
    }),
  }),
  settings: () => {},
});

// Mock constants
(firestore as any).CACHE_SIZE_UNLIMITED = -1;
(firestore as any).FieldValue = {
  serverTimestamp: () => new Date().toISOString(),
};

export { auth, firestore };

export default auth;
