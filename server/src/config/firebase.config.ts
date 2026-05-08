/**
 * NUCLEAR CONSOLIDATION v2.0
 * This file now re-exports from the centralized firebase-admin service
 * to ensure all legacy code paths share the same initialized instance.
 */
import { admin, initializeFirebase } from '../services/firebase-admin';

// Ensure initialization
initializeFirebase();

const isInitialized = admin.apps.length > 0;

export const getBucket = () => {
  if (!isInitialized) {
    console.warn('[Firebase] Warning: SDK not fully initialized for storage.');
    return null;
  }
  return admin.storage().bucket();
};

export default admin;
