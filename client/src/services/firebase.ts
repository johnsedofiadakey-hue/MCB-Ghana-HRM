import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAL20uzqPnXWbJNGmqgHZ2-UsEmMdbrAGw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mcb-hrm-ghana.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mcb-hrm-ghana",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mcb-hrm-ghana.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "709525010185",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:709525010185:web:1b3ba1e1ddf82307a6c5d8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const microsoftProvider = new OAuthProvider('microsoft.com');
