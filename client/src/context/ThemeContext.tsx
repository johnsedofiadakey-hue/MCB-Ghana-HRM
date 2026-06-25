import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useWebSocket } from '../services/websocket';
import { useTranslation } from 'react-i18next';
import { BrandingService } from '../services/branding.service';

export type ThemeName = 'premium-monolith' | 'premium-canvas' | 'premium-aero';

export interface Settings {
  companyName: string;
  name: string;
  subtitle: string;
  companyLogoUrl: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgMain: string;
  bgCard: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  sidebarBg: string;
  sidebarActive: string;
  sidebarText: string;
  bgElevated: string;
  bgInput: string;
  borderSubtle: string;
  textInverse: string;
  defaultLanguage: string;
  language: string;
  currency: string;
  trialDays: number;
  vatRate: number;
  idCardPrimaryColor?: string;
  idCardAccentColor?: string;
  idCardShowLogo?: boolean;
  idCardShowQrCode?: boolean;
  allowSelfRegistration: boolean;
  themePreset: ThemeName;
  // Billing & Subscription
  monthlyPriceGHS?: string;
  annualPriceGHS?: string;
  monthlyPrice?: number;
  annualPrice?: number;
  paystackPublicKey?: string;
  paystackPayLink?: string;
  // White-Label Details
  address: string;
  phone: string;
  email: string;
  city: string;
  country: string;
  isAiEnabled: boolean;
  allowCallCard?: boolean;
  successColor?: string;
  warningColor?: string;
  errorColor?: string;
  infoColor?: string;
  defaultLeaveAllowance?: number;
  allowLeaveCarryForward?: boolean;
  allowLeaveBorrowing?: boolean;
  carryForwardLimit?: number;
  borrowingLimit?: number;
  // Payroll Settings
  ssnitRate?: number;
  employerSsnitRate?: number;
  payeBands?: string | any[];
  // Personnel ID Card Customization
  idCardOrientation?: 'VERTICAL' | 'HORIZONTAL';
  idCardTheme?: 'LIGHT' | 'DARK';
  idCardBackMessage?: string;
  idCardSecurityText?: string;
}

// Contrast utilities removed as they are currently handled by theme tokens

export const getOrgIdFromToken = () => {
  // STANDALONE MODE: Always return the primary organization ID
  return 'mcb-ghana-tenant';
};

const hexToRgb = (hex: string) => {
  if (!hex) return '0, 0, 0';
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  if (cleanHex.length !== 6) return '0, 0, 0';
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '0, 0, 0';
  return `${r}, ${g}, ${b}`;
};

const getLuminosity = (hex: string) => {
  const rgb = hexToRgb(hex).split(',').map(v => parseInt(v.trim()));
  // Using the relative luminance formula
  return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
};

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  settings: Settings | null;
  refreshSettings: () => Promise<void>;
  previewSettings: (customSettings: Settings) => void;
  formatCurrency: (amount: number | string) => string;
  setLanguage: (lang: string) => void;
}

const resolveBranding = (data: any): any => {
  if (!data) return data;
  const processed = { ...data };
  // Ensure the internal fallback is always applied to incoming data
  if (!processed.logoUrl) {
    processed.logoUrl = processed.companyLogoUrl || processed.logo || null;
  }
  return processed;
};

const mergeSettings = (prev: Settings | null, next: any): Settings => {
  if (!prev) return resolveBranding(next) as Settings;
  
  const merged = { ...prev, ...next };
  
  // ✅ LOGO SHIELD: Never overwrite a populated logo with an empty one
  if (prev.logoUrl && !next.logoUrl && !next.companyLogoUrl && !next.logo) {
    merged.logoUrl = prev.logoUrl;
    merged.companyLogoUrl = prev.companyLogoUrl;
  }
  
  return resolveBranding(merged) as Settings;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const THEMES: { id: ThemeName; label: string; emoji: string; dark: boolean }[] = [
  { id: 'premium-monolith', label: 'Dark Navy', emoji: '🌊', dark: true },
  { id: 'premium-canvas', label: 'Canvas', emoji: '☀️', dark: false },
  { id: 'premium-aero', label: 'Aero', emoji: '💧', dark: false },
];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const orgId = getOrgIdFromToken();
    const saved = localStorage.getItem(`mcb_theme_preference_${orgId}`) as ThemeName;
    return saved || 'premium-monolith';
  });
  const [settings, setSettings] = useState<Settings | null>(() => {
    try {
      const orgId = getOrgIdFromToken();
      const cached = localStorage.getItem(`mcb_branding_cache_${orgId}`);
      return cached ? JSON.parse(cached) : null;
    } catch(e) { return null; }
  });

  const settingsRef = React.useRef<Settings | null>(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const lastAppliedRef = React.useRef<string>('');
  const lastThemeRef = React.useRef<ThemeName | null>(null);

  // One-time cleanup of early-paint rescue styles
  useEffect(() => {
    const cleanup = () => {
      const pinA = document.getElementById('pinnacle-core-lock');
      const pinB = document.getElementById('pinnacle-identity-lock');
      if (pinA) pinA.remove();
      if (pinB) pinB.remove();
      document.documentElement.classList.remove('boot-lock');
    };
    
    // Immediate cleanup
    cleanup();
    // Delayed cleanup for safety
    const timer = setTimeout(cleanup, 1000);
    return () => clearTimeout(timer);
  }, []);

  const applyTheme = useCallback((themeName: ThemeName, customSettings?: Settings | null) => {
    const root = document.documentElement;
    const settingsToUse = customSettings || settingsRef.current;
    if (!settingsToUse) return;

    // --- HYDRATION LOCK: Detect any granular change to branding tokens ---
    const colorSignature = JSON.stringify({ 
      themeName, 
      p: settingsToUse.primaryColor, 
      bg: settingsToUse.bgMain, 
      sc: settingsToUse.sidebarBg,
      be: settingsToUse.bgElevated,
      bi: settingsToUse.bgInput,
      bs: settingsToUse.borderSubtle,
      ti: settingsToUse.textInverse,
      suc: settingsToUse.successColor,
      war: settingsToUse.warningColor,
      err: settingsToUse.errorColor,
      inf: settingsToUse.infoColor
    });

    if (lastAppliedRef.current === colorSignature && root.getAttribute('data-theme') === themeName) {
      return; 
    }
    
    lastAppliedRef.current = colorSignature;
    root.setAttribute('data-theme', themeName);

    const primaryRgb = hexToRgb(settingsToUse.primaryColor || '');
    const accentRgb  = hexToRgb(settingsToUse.accentColor  || '');

    const tokens: [string, string | null][] = [
      ['primary',       settingsToUse.primaryColor],
      ['primary-rgb',   primaryRgb],
      ['primary-10',    primaryRgb  ? `rgba(${primaryRgb}, 0.10)`  : null],
      ['primary-hover', settingsToUse.primaryColor ? null : null], // keep theme default
      ['accent',        settingsToUse.accentColor],
      ['accent-rgb',    accentRgb],
      ['accent-10',     accentRgb   ? `rgba(${accentRgb}, 0.10)`  : null],
      ['ring-color',    primaryRgb  ? `rgba(${primaryRgb}, 0.25)`  : null],
      ['bg-hover',      primaryRgb  ? `rgba(${primaryRgb}, 0.05)`  : null],
      ['bg-main',       settingsToUse.bgMain],
      ['bg-card',       settingsToUse.bgCard],
      ['bg-elevated',   settingsToUse.bgElevated || settingsToUse.secondaryColor || settingsToUse.bgCard],
      ['bg-input',      settingsToUse.bgInput || settingsToUse.bgMain],
      ['border',        settingsToUse.borderSubtle || null],
      ['border-subtle', settingsToUse.borderSubtle || null],
      ['text-primary',  settingsToUse.textPrimary],
      ['text-secondary',settingsToUse.textSecondary],
      ['text-muted',    settingsToUse.textMuted],
      ['text-inverse',  settingsToUse.textInverse || (getLuminosity(settingsToUse.primaryColor || '#000000') > 0.6 ? 'rgba(0,0,0,0.85)' : '#ffffff')],
      ['bg-sidebar',         settingsToUse.sidebarBg],
      ['bg-sidebar-active',  settingsToUse.sidebarActive],
      ['text-sidebar',       settingsToUse.sidebarColor || settingsToUse.textSecondary || null],
      ['text-sidebar-active',settingsToUse.sidebarText  || settingsToUse.primaryColor],
      ['growth',       settingsToUse.secondaryColor || settingsToUse.primaryColor],
      ['growth-light', hexToRgb(settingsToUse.secondaryColor || settingsToUse.primaryColor || '')],
      ['success', settingsToUse.successColor || null],
      ['warning', settingsToUse.warningColor || null],
      ['error',   settingsToUse.errorColor   || null],
      ['info',    settingsToUse.infoColor    || null],
    ];

    // 🚀 ATOMIC PERF: Update CSS Variables directly on root for zero-latency color shifts
    tokens.forEach(([key, value]) => {
      if (value) root.style.setProperty(`--${key}`, value, 'important');
    });

    // 🚀 SELECTIVE INJECTION: Only update the <style> block if the theme skeleton changed
    if (lastThemeRef.current !== themeName) {
      lastThemeRef.current = themeName;
      let style = document.getElementById('theme-overrides');
      if (!style) {
        style = document.createElement('style');
        style.id = 'theme-overrides';
        document.head.appendChild(style);
      }
      
      let css = `
        /* Dynamic Branding Overlord: Map hardcoded Tailwind utility classes to Brand Variables */
        html[data-theme="${themeName}"] .bg-white { background-color: var(--bg-card) !important; }
        html[data-theme="${themeName}"] .bg-slate-50, html[data-theme="${themeName}"] .bg-gray-50 { background-color: var(--bg-main) !important; }
        html[data-theme="${themeName}"] .bg-slate-100, html[data-theme="${themeName}"] .bg-gray-100 { background-color: var(--bg-elevated) !important; }
        html[data-theme="${themeName}"] .text-slate-900, html[data-theme="${themeName}"] .text-gray-900 { color: var(--text-primary) !important; }
        html[data-theme="${themeName}"] .text-slate-700, html[data-theme="${themeName}"] .text-gray-700 { color: var(--text-primary) !important; }
        html[data-theme="${themeName}"] .text-slate-600, html[data-theme="${themeName}"] .text-gray-600 { color: var(--text-secondary) !important; }
        html[data-theme="${themeName}"] .text-slate-400, html[data-theme="${themeName}"] .text-gray-400 { color: var(--text-muted) !important; }
        html[data-theme="${themeName}"] .border-slate-200, html[data-theme="${themeName}"] .border-gray-200 { border-color: var(--border-subtle) !important; }
        html[data-theme="${themeName}"] .border-slate-100, html[data-theme="${themeName}"] .border-gray-100 { border-color: var(--border-subtle) !important; }
        
        /* Brand Color Normalization */
        html[data-theme="${themeName}"] .bg-indigo-600, 
        html[data-theme="${themeName}"] .bg-blue-600, 
        html[data-theme="${themeName}"] .bg-violet-600,
        html[data-theme="${themeName}"] .bg-purple-600,
        html[data-theme="${themeName}"] .bg-fuchsia-600,
        html[data-theme="${themeName}"] .bg-brand-primary,
        html[data-theme="${themeName}"] .bg-purple-500 { background-color: var(--primary) !important; }
        
        html[data-theme="${themeName}"] .text-indigo-600, 
        html[data-theme="${themeName}"] .text-blue-600,
        html[data-theme="${themeName}"] .text-violet-600,
        html[data-theme="${themeName}"] .text-purple-600,
        html[data-theme="${themeName}"] .text-purple-400,
        html[data-theme="${themeName}"] .text-brand-primary,
        html[data-theme="${themeName}"] .text-purple-500 { color: var(--primary) !important; }

        html[data-theme="${themeName}"] .border-indigo-600, 
        html[data-theme="${themeName}"] .border-blue-600,
        html[data-theme="${themeName}"] .border-violet-600,
        html[data-theme="${themeName}"] .border-purple-600,
        html[data-theme="${themeName}"] .border-brand-primary,
        html[data-theme="${themeName}"] .border-purple-500 { border-color: var(--primary) !important; }

        /* Alpha/Opacity Variants */
        html[data-theme="${themeName}"] .bg-purple-500/5, html[data-theme="${themeName}"] .bg-purple-500/10, html[data-theme="${themeName}"] .bg-purple-500/20 { background-color: var(--primary) !important; opacity: 0.1; }
        
        /* Surfaces & Modals */
        html[data-theme="${themeName}"] .bg-black/60, html[data-theme="${themeName}"] .bg-slate-900/80 { background-color: var(--bg-main) !important; opacity: 0.8; backdrop-filter: blur(4px); }
        
        @media print {
          :root {
            --bg-main: #ffffff !important;
            --text-primary: #0f172a !important;
          }
          body { background: white !important; color: #0f172a !important; }
        }

        /* Force Root Surfaces */
        html[data-theme="${themeName}"], html[data-theme="${themeName}"] body, html[data-theme="${themeName}"] #root { 
          background-color: var(--bg-main) !important; 
          color: var(--text-primary) !important; 
        }

        html[data-theme="${themeName}"] .nx-card { 
          background-color: var(--bg-card) !important;
          border-color: var(--border-subtle) !important;
        }

        /* Status Colors */
        html[data-theme="${themeName}"] .bg-emerald-500, html[data-theme="${themeName}"] .bg-green-500 { background-color: var(--success) !important; }
        html[data-theme="${themeName}"] .bg-amber-500, html[data-theme="${themeName}"] .bg-orange-500 { background-color: var(--warning) !important; }
        html[data-theme="${themeName}"] .bg-rose-500, html[data-theme="${themeName}"] .bg-red-500 { background-color: var(--error) !important; }
        html[data-theme="${themeName}"] .bg-cyan-500, html[data-theme="${themeName}"] .bg-blue-500 { background-color: var(--info) !important; }
      `;
      style.innerHTML = css;
    }

    // --- DYNAMIC FAVICON SYNC ---
    if (settingsToUse.logoUrl) {
      let favicon = document.getElementById('dynamic-favicon') as HTMLLinkElement;
      if (!favicon) {
        favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (!favicon) {
          favicon = document.createElement('link');
          favicon.rel = 'icon';
          favicon.id = 'dynamic-favicon';
          document.head.appendChild(favicon);
        }
      }
      favicon.href = settingsToUse.logoUrl;
    }

    // IDENTITY-AWARE PERSISTENCE
    const orgId = getOrgIdFromToken();
    localStorage.setItem(`mcb_branding_cache_${orgId}`, JSON.stringify(settingsToUse));
    localStorage.setItem(`mcb_theme_preference_${orgId}`, themeName);

    // ZERO-FLICKER SYNC
    const customColors: Record<string, string> = {};
    tokens.forEach(([key, value]) => { if (value) customColors[key] = value; });
    localStorage.setItem(`mcb_theme_custom_colors_${orgId}`, JSON.stringify(customColors));
  }, []); // Explicitly stable to prevent dependency loopsency loops

  const refreshSettings = useCallback(async () => {
    try {
      const orgId = getOrgIdFromToken();
      const hostname = window.location.hostname;
      const cached = localStorage.getItem(`mcb_branding_cache_${orgId}`);
      const savedTheme = localStorage.getItem(`mcb_theme_preference_${orgId}`) as ThemeName || theme;
      
      // Early apply from cache to prevent flash
      if (cached) {
         try {
           const fullSettings = JSON.parse(cached);
           setSettings(fullSettings);
           applyTheme(savedTheme, fullSettings);
         } catch(e){}
      }

      // Fetch fresh settings. The backend will use X-Tenant-Domain if no Bearer token is present.
      const res = await api.get('/settings');
      const data = resolveBranding(res.data);

      if (data) {
        setSettings(prev => mergeSettings(prev, data));
        const targetTheme = (data.themePreset as ThemeName) || theme;
        setThemeState(targetTheme);
        
        const effectiveOrgId = data.organizationId || orgId;
        localStorage.setItem(`mcb_theme_preference_${effectiveOrgId}`, targetTheme);
        applyTheme(targetTheme, data);

        // Cache for next session
        localStorage.setItem(`mcb_branding_cache_${effectiveOrgId}`, JSON.stringify(data));
      }
    } catch (err) {
      console.warn('[ThemeContext] Unauthenticated or failed settings fetch, falling back to cached/default');
      const orgId = getOrgIdFromToken();
      const savedTheme = localStorage.getItem(`mcb_theme_preference_${orgId}`) as ThemeName || theme;
      applyTheme(savedTheme, null); 
    }
  }, [theme, applyTheme]);

  useEffect(() => {
    refreshSettings();
    
    // Subscribe to real-time branding updates (Zero-Flicker Sync)
    const orgId = getOrgIdFromToken();
    if (orgId && orgId !== 'default') {
      const unsubscribeBranding = BrandingService.subscribeToBranding(orgId, (data) => {
        console.log('[ThemeContext] Real-time branding sync from Firebase...');
        const updatedPreset = (data.themePreset as ThemeName) || 'premium-monolith';
        
        setSettings(prev => {
          const newSettings = mergeSettings(prev, data);
          // Apply theme immediately using the incoming data
          applyTheme(updatedPreset, newSettings);
          return newSettings;
        });

        if (data.themePreset) {
          setThemeState(updatedPreset);
        }
      });
      
      return () => {
        if (unsubscribeBranding) unsubscribeBranding();
      };
    }
  }, [refreshSettings, applyTheme]); // Removed settings and theme to break the loop

  const { i18n } = useTranslation();

  const setLanguage = useCallback((lang: string) => {
    localStorage.setItem('mcb_user_language', lang);
    i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
  }, [i18n]);

  useEffect(() => {
    const userPref = localStorage.getItem('mcb_user_language');
    const targetLang = userPref || settings?.defaultLanguage || i18n.language || 'en';
    
    if (i18n.language !== targetLang) {
      i18n.changeLanguage(targetLang);
      document.documentElement.lang = targetLang;
    }
  }, [settings?.defaultLanguage, i18n]);

  // Real-time synchronization: Listen for settings updates via WebSocket
  const handleWSMessage = useCallback((type: string) => {
    if (type === 'SETTINGS_UPDATED') {
      console.log('[ThemeContext] Settings updated via cloud, refreshing...');
      refreshSettings();
    }
  }, [refreshSettings]);

  // Subscribe to system-wide settings updates
  useWebSocket(handleWSMessage);

  const setTheme = (newTheme: ThemeName) => {
    const orgId = getOrgIdFromToken();
    setThemeState(newTheme);
    localStorage.setItem(`mcb_theme_preference_${orgId}`, newTheme);
    applyTheme(newTheme, settings);
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      settings, 
      refreshSettings, 
      previewSettings: (s) => applyTheme(theme, s),
      formatCurrency: (amount: number | string) => {
        const symbol = settings?.currency || 'GHS';
        const val = typeof amount === 'string' ? parseFloat(amount) : amount;
        return `${symbol} ${isNaN(val) ? '0.00' : val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      },
      setLanguage
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
