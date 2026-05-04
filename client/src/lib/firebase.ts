import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDocFromCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Environment variable validation
const isPlaceholder = (val?: string) => !val || val === 'PLACEHOLDER' || val.includes('REPLACE_ME');

const firebaseConfig = {
  apiKey: "AIzaSyAL20uzqPnXWbJNGmqgHZ2-UsEmMdbrAGw",
  authDomain: "mcb-hrm-ghana.firebaseapp.com",
  projectId: "mcb-hrm-ghana",
  storageBucket: "mcb-hrm-ghana.firebasestorage.app",
  messagingSenderId: "709525010185",
  appId: "1:709525010185:web:1b3ba1e1ddf82307a6c5d8"
};

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
