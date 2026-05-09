/**
 * STORAGE SERVICE (Enterprise Resilience Layer)
 * 
 * Centralized, type-safe, and crash-proof wrapper for localStorage.
 * Eliminates redundant try-catch blocks and provides a unified interface
 * for all browser-side persistence.
 */

export enum StorageKey {
  AUTH_TOKEN = 'mcb_auth_token',
  REFRESH_TOKEN = 'mcb_refresh_token',
  USER = 'mcb_user',
  IS_SANDBOX = 'mcb_is_sandbox',
  SIDEBAR_COLLAPSED = 'sidebar_collapsed',
  THEME_PREFERENCE = 'mcb_theme_preference',
  BRANDING_CACHE = 'mcb_branding_cache',
  DISMISSED_ANNOUNCEMENTS = 'dismissed_announcements',
  LANGUAGE = 'mcb_user_language',
  DEV_TOKEN = 'mcb_dev_token',
  DEV_MODE = 'mcb_dev_mode',
  DEV_FIREBASE_TOKEN = 'mcb_dev_firebase_token'
}

class StorageService {
  /**
   * Safe retrieval with automatic JSON parsing and default fallback.
   */
  getItem<T>(key: StorageKey, defaultValue: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || raw === 'undefined') return defaultValue;
      
      // If the expected type is string and it doesn't look like JSON, return as is
      // We also check for 'undefined' to prevent JSON.parse from blowing up
      if (typeof defaultValue === 'string' && !raw.startsWith('{') && !raw.startsWith('[')) {
        return raw as unknown as T;
      }

      // Safety check: if raw is not valid JSON and we are not expecting a string, log it and return default
      try {
        return JSON.parse(raw) as T;
      } catch (parseError) {
        // If the expected type is string, return the raw string
        if (typeof defaultValue === 'string') return raw as unknown as T;
        // Otherwise return the default value as fallback
        return defaultValue;
      }
    } catch (error) {
      console.warn(`[StorageService] Failed to parse key "${key}". Returning default.`, error);
      return defaultValue;
    }
  }

  /**
   * Safe persistence with automatic stringification.
   */
  setItem<T>(key: StorageKey, value: T): void {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error(`[StorageService] Failed to save key "${key}":`, error);
    }
  }

  /**
   * Remove a specific key.
   */
  removeItem(key: StorageKey): void {
    localStorage.removeItem(key);
  }

  /**
   * Clear all nexus-related storage.
   */
  clearSession(): void {
    const keysToRemove = [
      StorageKey.AUTH_TOKEN,
      StorageKey.REFRESH_TOKEN,
      StorageKey.USER,
      StorageKey.IS_SANDBOX,
      StorageKey.DEV_TOKEN,
      StorageKey.DEV_FIREBASE_TOKEN
    ];
    keysToRemove.forEach(k => this.removeItem(k));
    sessionStorage.clear();
  }

  /**
   * Identify current org context for scoped keys.
   */
  getScopedKey(key: string): string {
    const orgId = this.getOrgId();
    return `${key}_${orgId}`;
  }

  private getOrgId(): string {
     const user = this.getItem<any>(StorageKey.USER, null);
     return user?.organizationId || 'default';
  }
}

export const storage = new StorageService();
