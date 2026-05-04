import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDocFromCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Environment variable validation
const isPlaceholder = (val?: string) => !val || val === 'PLACEHOLDER' || val.includes('REPLACE_ME');

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAL20uzqPnXWbJNGmqgHZ2-UsEmMdbrAGw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mcb-hrm-ghana.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mcb-hrm-ghana",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mcb-hrm-ghana.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "709525010185",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:709525010185:web:1b3ba1e1ddf82307a6c5d8"
};

if (isPlaceholder(firebaseConfig.apiKey)) {
  console.warn('[Firebase] Warning: API Key is missing or set to placeholder. Firestore persistence will be disabled.');
}

const app = initializeApp(firebaseConfig);

// Initialize Firestore with Persistence enabled for production stability
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ 
    tabManager: persistentMultipleTabManager() 
  })
});

export const storage = getStorage(app);
export const isFirebaseReady = true;

export default app;
