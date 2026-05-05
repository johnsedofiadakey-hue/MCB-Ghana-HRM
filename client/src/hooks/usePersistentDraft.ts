import { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot, getDoc, getDocFromCache, getDocFromServer } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { debounce } from '../utils/performance';

/**
 * A hook that syncs local state with a Firestore document for real-time persistence.
 * Robust offline-first strategy with cache-first loading and graceful failure states.
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

    let isMounted = true;
    const docRef = doc(db, collectionName, id);
    const isPlaceholder = db.app.options.apiKey === 'PLACEHOLDER' || !db.app.options.apiKey;

    if (isPlaceholder) {
      setLoading(false);
      return;
    }

    // 🛡️ FAIL-SAFE TIMEOUT: Unblock UI quickly if network is hanging
    let timeoutHandle: any;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('TIMEOUT')), 2500);
    });
    
    const loadData = async () => {
      try {
        // 1. Try CACHE first (Instant Load)
        try {
          const cachedSnap = await getDocFromCache(docRef);
          if (cachedSnap.exists() && isMounted) {
            setData(cachedSnap.data() as T);
            setLoading(false);
          }
        } catch (cacheErr) {
          // Cache miss is fine
        }

        // 2. Try SERVER with a race against the safety timeout
        try {
          const snap = await Promise.race([
            getDocFromServer(docRef),
            timeoutPromise
          ]) as any;

          if (snap && snap.exists() && isMounted) {
            setData(snap.data() as T);
          }
        } catch (raceErr: any) {
          if (raceErr.message === 'TIMEOUT') {
             console.info(`[Sync] Server fetch deferred for ${collectionName}/${id} (Using local/cached state).`);
          } else {
             throw raceErr;
          }
        }
      } catch (err: any) {
        const isOffline = err?.code === 'unavailable' || err?.message?.includes('offline');
        if (!isOffline) console.error('[Firebase Load Error]:', err);
      } finally {
        if (isMounted) {
          clearTimeout(timeoutHandle);
          setLoading(false);
        }
      }
    };

    loadData();

    // Real-time sync
    if (sync) {
      const unsub = onSnapshot(docRef, (snap) => {
        if (snap.exists() && isMounted) {
          const remoteData = snap.data() as T;
          setData(remoteData);
        }
      }, (err) => {
        console.error('[Firebase Snapshot Error]:', err);
      });
      return () => {
        isMounted = false;
        unsub();
      };
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutHandle);
    };
  }, [collectionName, id, sync]);

  // Debounced sync back to Firestore
  const [debouncedSync] = useState(() => 
    debounce(async (id: string, collectionName: string, newData: any) => {
      try {
        const docRef = doc(db, collectionName, id);
        // Optimistic Merge
        await setDoc(docRef, { ...newData, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (err: any) {
        const isOffline = err?.code === 'unavailable' || err?.message?.includes('offline');
        if (!isOffline) {
          console.error('[Firebase Sync Error]:', err);
        }
      }
    }, 1000)
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
