import { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { debounce } from '../utils/performance';

/**
 * A hook that syncs local state with a Firestore document for real-time persistence.
 * Useful for long forms (Employee Profile, Onboarding) to prevent data loss on refresh.
 */
export function usePersistentDraft<T>(collectionName: string, id: string, initialValue: T, sync = false) {
  const [data, setData] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);

  // Load initial draft from Firestore
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const docRef = doc(db, collectionName, id);
    
    const isPlaceholder = db.app.options.apiKey === 'PLACEHOLDER' || !db.app.options.apiKey;
    
    // 🛡️ Fail-safe Timeout: Unblock UI after 3 seconds if Firebase is hanging/offline
    const timeout = setTimeout(() => {
      setLoading(false);
      if (!isPlaceholder) {
        console.warn(`[Firebase] Timeout fetching draft for ${collectionName}/${id}. If this persists in production, please verify that VITE_FIREBASE_* environment variables are correctly injected into your build.`);
      }
    }, 10000);

    if (isPlaceholder) {
      clearTimeout(timeout);
      setLoading(false);
      return;
    }

    getDoc(docRef)
      .then((snap) => {
        if (snap.exists()) {
          setData(snap.data() as T);
        }
      })
      .catch((err) => {
        // Only log if it's a real project error, not a placeholder/misconfig issue
        if (!isPlaceholder) {
           console.error('[Firebase Load Error]:', err);
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });

    // Real-time sync is now optional and disabled by default to prevent re-render loops in high-frequency forms
    if (sync) {
      const unsub = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const remoteData = snap.data() as T;
          setData(remoteData);
        }
      }, (err) => {
        console.error('[Firebase Snapshot Error]:', err);
      });
      return () => unsub();
    }
  }, [collectionName, id, sync]);

  // Debounced sync back to Firestore to prevent UI lag during rapid typing
  const [debouncedSync] = useState(() => 
    debounce(async (id: string, collectionName: string, newData: any) => {
      try {
        const docRef = doc(db, collectionName, id);
        await setDoc(docRef, { ...newData, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (err) {
        console.error('[Firebase Sync Error]:', err);
      }
    }, 1000) // 1 second debounce for drafts
  );

  // Sync changes back to Firestore
  const updateDraft = (newData: T) => {
    setData(newData);
    if (!id) return;
    debouncedSync(id, collectionName, newData);
  };

  // Clear draft from Firestore
  const clearDraft = async () => {
    if (!id) return;
    try {
      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, { ...initialValue, isCleared: true, updatedAt: new Date().toISOString() });
    } catch (err) {
      console.error('[Firebase Clear Error]:', err);
    }
  };

  return { data, updateDraft, clearDraft, loading };
}
