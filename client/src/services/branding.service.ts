import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseReady } from '../lib/firebase';

export interface BrandingData {
  companyLogoUrl: string;
  primaryColor?: string;
  accentColor?: string;
  bgMain?: string;
  bgCard?: string;
  bgElevated?: string;
  bgInput?: string;
  borderSubtle?: string;
  textPrimary?: string;
  textSecondary?: string;
  textMuted?: string;
  textInverse?: string;
  sidebarBg?: string;
  sidebarActive?: string;
  sidebarText?: string;
  name?: string;
  themePreset?: string;
  idCardPrimaryColor?: string;
  idCardAccentColor?: string;
  idCardShowLogo?: boolean;
  idCardShowQrCode?: boolean;
  idCardOrientation?: 'VERTICAL' | 'HORIZONTAL';
  idCardTheme?: 'LIGHT' | 'DARK';
  idCardBackMessage?: string;
  idCardSecurityText?: string;
  updatedAt?: any;
}

/**
 * Service to manage permanent branding synchronization in Firebase.
 * This ensures "Zero-Flicker" logo and theme loading across all sessions.
 */
export const BrandingService = {
  /**
   * Updates the permanent branding record for an organization.
   */
  async updateBranding(orgId: string, data: Partial<BrandingData>): Promise<void> {
    if (!isFirebaseReady) return;
    
    try {
      const brandingRef = doc(db, 'branding', orgId);
      await setDoc(brandingRef, {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('[BrandingService] Sync failed:', error);
    }
  },

  /**
   * Fetches the current branding directly from Firestore.
   */
  async getBranding(orgId: string): Promise<BrandingData | null> {
    if (!isFirebaseReady) return null;
    
    try {
      const brandingRef = doc(db, 'branding', orgId);
      const docSnap = await getDoc(brandingRef);
      return docSnap.exists() ? docSnap.data() as BrandingData : null;
    } catch (error) {
      console.error('[BrandingService] Retrieval failed:', error);
      return null;
    }
  },

  /**
   * Subscribes to real-time branding updates.
   */
  subscribeToBranding(orgId: string, callback: (data: BrandingData) => void): (() => void) | null {
    if (!isFirebaseReady) return null;
    
    const brandingRef = doc(db, 'branding', orgId);
    return onSnapshot(brandingRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data() as BrandingData);
      }
    });
  }
};
