import admin from '../config/firebase.config';

/**
 * Service for handling real-time data synchronization with Firebase Firestore.
 * This ensures that branding and institutional identity updates are propagated
 * instantly to all connected clients.
 */
export class FirestoreService {
  private static db: admin.firestore.Firestore | null = null;

  private static getDB() {
    if (this.db) return this.db;
    try {
      this.db = admin.firestore();
      return this.db;
    } catch (error) {
      console.warn('[FirestoreService] Firestore not available:', error);
      return null;
    }
  }

  /**
   * Synchronizes organization branding metadata to Firestore.
   * This corresponds to the 'branding' collection used by the client's BrandingService.
   */
  static async syncBranding(orgId: string, data: any): Promise<void> {
    const db = this.getDB();
    if (!db) return;

    try {
      const brandingRef = db.collection('branding').doc(orgId);
      
      // Filter for branding-specific fields to avoid polluting Firestore with system settings
      const brandingPayload = {
        name: data.name,
        companyName: data.companyName || data.name,
        logoUrl: data.logoUrl || data.companyLogoUrl,
        companyLogoUrl: data.companyLogoUrl || data.logoUrl,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        accentColor: data.accentColor,
        textColor: data.textColor,
        sidebarColor: data.sidebarColor,
        themePreset: data.themePreset,
        bgMain: data.bgMain,
        bgCard: data.bgCard,
        bgElevated: data.bgElevated,
        bgInput: data.bgInput,
        borderSubtle: data.borderSubtle,
        textPrimary: data.textPrimary,
        textSecondary: data.textSecondary,
        textMuted: data.textMuted,
        textInverse: data.textInverse,
        sidebarBg: data.sidebarBg,
        sidebarActive: data.sidebarActive,
        sidebarText: data.sidebarText,
        // Personnel ID Card Specifics
        idCardPrimaryColor: data.idCardPrimaryColor,
        idCardAccentColor: data.idCardAccentColor,
        idCardShowLogo: data.idCardShowLogo,
        idCardShowQrCode: data.idCardShowQrCode,
        idCardOrientation: data.idCardOrientation,
        idCardTheme: data.idCardTheme,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Remove undefined fields
      const cleanPayload = Object.fromEntries(
        Object.entries(brandingPayload).filter(([_, v]) => v !== undefined)
      );

      if (Object.keys(cleanPayload).length > 1) { // More than just updatedAt
        await brandingRef.set(cleanPayload, { merge: true });
        console.log(`[FirestoreService] Branding synchronized for org: ${orgId}`);
      }
    } catch (error) {
      console.error(`[FirestoreService] Sync failure for org ${orgId}:`, error);
    }
  }
}

export const firestoreService = FirestoreService;
