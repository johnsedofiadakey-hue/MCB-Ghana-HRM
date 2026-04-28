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
  return 'default-tenant';
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
  { id: 'premium-monolith', label: 'Premium Monolith', emoji: '🌑', dark: true },
  { id: 'premium-canvas', label: 'Premium Canvas', emoji: '⚪', dark: false },
  { id: 'premium-aero', label: 'Premium Aero', emoji: '🌿', dark: false },
];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const orgId = getOrgIdFromToken();
    const saved = localStorage.getItem(`nexus_theme_preference_${orgId}`) as ThemeName;
    return saved || 'premium-monolith';
  });
  const [settings, setSettings] = useState<Settings | null>(() => {
    try {
      const orgId = getOrgIdFromToken();
      const cached = localStorage.getItem(`nexus_branding_cache_${orgId}`);
      return cached ? JSON.parse(cached) : null;
    } catch(e) { return null; }
  });

  const settingsRef = React.useRef<Settings | null>(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const lastAppliedRef = React.useRef<string>('');

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

    // Singleton Style Tag: Check for existing or create once
    let style = document.getElementById('theme-overrides');
    if (!style) {
      style = document.createElement('style');
      style.id = 'theme-overrides';
      document.head.appendChild(style);
    }
    
    let css = `html[data-theme="${themeName}"], :root {`;
    
    const tokens: [string, string | null][] = [
      ['primary', settingsToUse.primaryColor],
      ['primary-rgb', hexToRgb(settingsToUse.primaryColor || '')],
      ['accent', settingsToUse.accentColor],
      ['bg-main', settingsToUse.bgMain],
      ['bg-card', settingsToUse.bgCard],
      ['bg-elevated', settingsToUse.bgElevated || settingsToUse.secondaryColor || settingsToUse.bgCard], 
      ['bg-input', settingsToUse.bgInput || settingsToUse.bgMain],
      ['border-subtle', settingsToUse.borderSubtle || 'rgba(0,0,0,0.1)'],
      ['text-primary', settingsToUse.textPrimary],
      ['text-secondary', settingsToUse.textSecondary],
      ['text-muted', settingsToUse.textMuted],
      ['text-inverse', settingsToUse.textInverse || (getLuminosity(settingsToUse.primaryColor || '#000000') > 0.6 ? 'rgba(0,0,0,0.85)' : '#ffffff')],
      ['bg-sidebar', settingsToUse.sidebarBg],
      ['growth', settingsToUse.secondaryColor || settingsToUse.primaryColor],
      ['growth-light', hexToRgb(settingsToUse.secondaryColor || settingsToUse.primaryColor || '')],
      ['bg-sidebar-active', settingsToUse.sidebarActive],
      ['text-sidebar', settingsToUse.textSecondary || '#64748b'],
      ['text-sidebar-active', settingsToUse.sidebarText || settingsToUse.primaryColor],
      ['success', settingsToUse.successColor || '#10b981'],
      ['warning', settingsToUse.warningColor || '#f59e0b'],
      ['error', settingsToUse.errorColor || '#ef4444'],
      ['info', settingsToUse.infoColor || '#06b6d4'],
    ];

    tokens.forEach(([key, value]) => {
      if (value) {
        // Use !important for the variables to override index.css root presets
        css += `--${key}: ${value} !important;`;
      }
    });
    
    css += `}\n`;

    // --- UNIVERSAL TAILWIND ENFORCER: Force standard utilities to follow variables ---
    // Increased specificity with html[data-theme] prefix to win over standard tailwind
    if (themeName.startsWith('premium-')) {
      css += `
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

        /* Alpha/Opacity Variants for Overlays */
        html[data-theme="${themeName}"] .bg-purple-500/5, html[data-theme="${themeName}"] .bg-purple-500/10, html[data-theme="${themeName}"] .bg-purple-500/20 { background-color: var(--primary) !important; opacity: 0.1; }
        html[data-theme="${themeName}"] .border-purple-500/20, html[data-theme="${themeName}"] .border-purple-500/30 { border-color: var(--primary) !important; opacity: 0.2; }
        
        /* Modal & Popup Overlord: Force consistency in overlays */
        html[data-theme="${themeName}"] .bg-black/60, html[data-theme="${themeName}"] .bg-slate-900/80 { background-color: var(--bg-main) !important; opacity: 0.8; backdrop-filter: blur(4px); }
        html[data-theme="${themeName}"] .bg-purple-50 { background-color: var(--primary) !important; opacity: 0.05; }
        html[data-theme="${themeName}"] .text-purple-700 { color: var(--primary) !important; }
        html[data-theme="${themeName}"] .border-purple-100 { border-color: var(--border-subtle) !important; }



        /* Status & Secondary Surface Catchers */
        html[data-theme="${themeName}"] .bg-slate-200, html[data-theme="${themeName}"] .bg-gray-200 { background-color: var(--border-subtle) !important; }
        html[data-theme="${themeName}"] .bg-slate-300, html[data-theme="${themeName}"] .bg-gray-300 { background-color: var(--border-strong) !important; }
        html[data-theme="${themeName}"] .bg-slate-800, html[data-theme="${themeName}"] .bg-gray-800 { background-color: var(--bg-elevated) !important; }
        html[data-theme="${themeName}"] .bg-slate-900, html[data-theme="${themeName}"] .bg-gray-900 { background-color: var(--bg-card) !important; }
        
        html[data-theme="${themeName}"] .text-slate-500, html[data-theme="${themeName}"] .text-gray-500 { color: var(--text-muted) !important; }
        html[data-theme="${themeName}"] .text-slate-300, html[data-theme="${themeName}"] .text-gray-300 { color: var(--text-muted) !important; }
        html[data-theme="${themeName}"] .text-slate-100, html[data-theme="${themeName}"] .text-gray-100 { color: var(--text-primary) !important; }
        html[data-theme="${themeName}"] .text-slate-50, html[data-theme="${themeName}"] .text-gray-50 { color: var(--text-primary) !important; }

        /* Button Hardening: Ensure Growth/Secondary color applies to primary-style buttons if needed */
        html[data-theme="${themeName}"] .btn-growth { background-color: var(--growth) !important; color: white !important; }
        html[data-theme="${themeName}"] .hover\:bg-indigo-700:hover { background-color: var(--primary) !important; filter: brightness(0.9); }


        /* Print Override System: Force Browser Print to use Brand Identity */
        @media print {
          :root {
            --bg-main: #ffffff !important;
            --bg-card: #ffffff !important;
            --bg-elevated: #f8fafc !important;
            --text-primary: #0f172a !important;
            --text-secondary: #475569 !important;
            --text-muted: #94a3b8 !important;
            --border-subtle: #e2e8f0 !important;
          }
          body { background: white !important; color: #0f172a !important; }
          .print-primary-text { color: var(--primary) !important; }
          .print-primary-bg { background-color: var(--primary) !important; -webkit-print-color-adjust: exact; }
          .print-border { border-color: var(--primary) !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }

        
        /* Force Root Colors & Global Surfaces */
        html[data-theme="${themeName}"], 
        html[data-theme="${themeName}"] body, 
        html[data-theme="${themeName}"] #root { 
          background-color: var(--bg-main) !important; 
          color: var(--text-primary) !important; 
        }

        html[data-theme="${themeName}"] .nx-card { 
          background-color: var(--bg-card) !important;
          border-color: var(--border-subtle) !important;
        }

        /* Status Colors Overlord */
        html[data-theme="${themeName}"] .bg-emerald-500, html[data-theme="${themeName}"] .bg-green-500 { background-color: var(--success) !important; }
        html[data-theme="${themeName}"] .text-emerald-500, html[data-theme="${themeName}"] .text-green-500, html[data-theme="${themeName}"] .text-emerald-600 { color: var(--success) !important; }
        
        html[data-theme="${themeName}"] .bg-amber-500, html[data-theme="${themeName}"] .bg-orange-500 { background-color: var(--warning) !important; }
        html[data-theme="${themeName}"] .text-amber-500, html[data-theme="${themeName}"] .text-orange-500, html[data-theme="${themeName}"] .text-amber-600 { color: var(--warning) !important; }
        
        html[data-theme="${themeName}"] .bg-rose-500, html[data-theme="${themeName}"] .bg-red-500 { background-color: var(--error) !important; }
        html[data-theme="${themeName}"] .text-rose-500, html[data-theme="${themeName}"] .text-red-500, html[data-theme="${themeName}"] .text-rose-600 { color: var(--error) !important; }

        html[data-theme="${themeName}"] .bg-cyan-500, html[data-theme="${themeName}"] .bg-blue-500, html[data-theme="${themeName}"] .bg-sky-500 { background-color: var(--info) !important; }
        html[data-theme="${themeName}"] .text-cyan-500, html[data-theme="${themeName}"] .text-blue-500, html[data-theme="${themeName}"] .text-sky-600 { color: var(--info) !important; }
      `;
    }
    
    style.innerHTML = css;

    // Atomic Swap Cleanup: Release the early paint locks immediately
    const pinA = document.getElementById('pinnacle-core-lock');
    const pinB = document.getElementById('pinnacle-identity-lock');
    if (pinA) pinA.remove();
    if (pinB) pinB.remove();

    // Atomic Swap Cleanup: Remove early-paint styles once React takes control
    const earlyStyle = document.getElementById('pinnacle-core-lock') || document.getElementById('pinnacle-identity-lock');
    if (earlyStyle) {
      setTimeout(() => {
        const pinA = document.getElementById('pinnacle-core-lock');
        const pinB = document.getElementById('pinnacle-identity-lock');
        if (pinA) pinA.remove();
        if (pinB) pinB.remove();
      }, 500);
    }

    // --- DYNAMIC FAVICON SYNC: Align browser tab identity with brand logo ---
    if (settingsToUse.logoUrl) {
      let favicon = document.getElementById('dynamic-favicon') as HTMLLinkElement;
      if (!favicon) {
        favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      }
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.id = 'dynamic-favicon';
        document.head.appendChild(favicon);
      }
      favicon.href = settingsToUse.logoUrl;

      // ALSO UPDATE APPLE ICON FOR MOBILE PWA
      let appleIcon = document.getElementById('dynamic-apple-icon') as HTMLLinkElement;
      if (!appleIcon) {
        appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
      }
      if (!appleIcon) {
        appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        appleIcon.id = 'dynamic-apple-icon';
        document.head.appendChild(appleIcon);
      }
      appleIcon.href = settingsToUse.logoUrl;
    }

    // IDENTITY-AWARE PERSISTENCE: Save full branding context (Logo + Name + Colors)
    const orgId = getOrgIdFromToken();
    localStorage.setItem(`nexus_branding_cache_${orgId}`, JSON.stringify(settingsToUse));
    localStorage.setItem(`nexus_theme_preference_${orgId}`, themeName);

    // --- ZERO-FLICKER SYNC: Align with index.html early-paint script ---
    const customColors: Record<string, string> = {};
    tokens.forEach(([key, value]) => { if (value) customColors[key] = value; });
    localStorage.setItem(`nexus_theme_custom_colors_${orgId}`, JSON.stringify(customColors));
    localStorage.setItem('nexus_theme_custom_colors', JSON.stringify(customColors));
  }, []); // Explicitly stable to prevent dependency loops

  const refreshSettings = useCallback(async () => {
    try {
      const orgId = getOrgIdFromToken();
      const hostname = window.location.hostname;
      const cached = localStorage.getItem(`nexus_branding_cache_${orgId}`);
      const savedTheme = localStorage.getItem(`nexus_theme_preference_${orgId}`) as ThemeName || theme;
      
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
        localStorage.setItem(`nexus_theme_preference_${effectiveOrgId}`, targetTheme);
        applyTheme(targetTheme, data);

        // Cache for next session
        localStorage.setItem(`nexus_branding_cache_${effectiveOrgId}`, JSON.stringify(data));
      }
    } catch (err) {
      console.warn('[ThemeContext] Unauthenticated or failed settings fetch, falling back to cached/default');
      const orgId = getOrgIdFromToken();
      const savedTheme = localStorage.getItem(`nexus_theme_preference_${orgId}`) as ThemeName || theme;
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
    localStorage.setItem('nexus_user_language', lang);
    i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
  }, [i18n]);

  useEffect(() => {
    const userPref = localStorage.getItem('nexus_user_language');
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
    localStorage.setItem(`nexus_theme_preference_${orgId}`, newTheme);
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
