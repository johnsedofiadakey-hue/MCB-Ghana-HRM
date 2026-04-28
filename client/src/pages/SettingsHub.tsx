import { useState, useEffect } from 'react';
import { 
  Building2, Palette, Globe, Shield, Bell, 
  CreditCard, Download, Save, ChevronRight,
  Lock, Languages, RefreshCw, Check, AlertTriangle,
  Mail, Smartphone, HardDrive, ShieldCheck, Sparkles,
  Database, CheckCircle, Calendar, Zap, Plus, Server
} from 'lucide-react';
import { useTheme, THEMES, type ThemeName } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { getLogoUrl } from '../utils/logo';
import { getStoredUser } from '../utils/session';
import { toast } from 'react-hot-toast';
import { usePersistentDraft } from '../hooks/usePersistentDraft';
import { BrandingService } from '../services/branding.service';
import { optimizeImage } from '../utils/image';
import api from '../services/api';
import { ApiIntegrations } from '../components/settings/ApiIntegrations';
import EmployeeIDCard from '../components/it/EmployeeIDCard';
import HardwareGuide from '../components/it/AttendanceHardwareGuide';

type SettingsTab = 'company' | 'leave' | 'branding' | 'id_cards' | 'localization' | 'security' | 'notifications' | 'billing' | 'data' | 'integrations' | 'payroll' | 'infrastructure';

const isValidHex = (hex: string) => /^#[0-9A-Fa-f]{6}$/.test(hex);

const ColorPicker = ({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (val: string) => void }) => (
  <div className="space-y-4">
    <label htmlFor={id} className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em] ml-1 cursor-pointer">{label}</label>
    <div className="flex items-center gap-3 group">
      <div className="relative shrink-0">
        <input 
          id={id}
          type="color" 
          className="w-12 h-12 rounded-2xl cursor-pointer bg-transparent border-none p-0 outline-none relative z-10 opacity-0"
          value={(() => {
            if (isValidHex(value)) return value;
            // Handle shorthand #FFF -> #FFFFFF
            if (/^#[0-9A-Fa-f]{3}$/.test(value)) {
              const r = value[1]; const g = value[2]; const b = value[3];
              return `#${r}${r}${g}${g}${b}${b}`;
            }
            return '#000000'; // Safe fallback for the native picker
          })()}
          onChange={e => onChange(e.target.value)}
        />
        <div 
          className="absolute inset-0 rounded-2xl border-2 border-[var(--bg-card)] shadow-sm transition-transform group-hover:scale-110" 
          style={{ backgroundColor: isValidHex(value) || /^#[0-9A-Fa-f]{3}$/.test(value) ? value : 'transparent' }}
        />
      </div>
      <input 
        type="text" 
        className="flex-1 bg-transparent border-b-2 border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none text-[13px] font-mono py-2 transition-all placeholder:text-[var(--text-muted)]"
        value={value}
        onChange={e => {
          let val = e.target.value;
          if (val && !val.startsWith('#')) val = '#' + val;
          onChange(val);
        }}
        placeholder="#XXXXXX"
      />
    </div>
  </div>
);

const SettingsHub = () => {
  const { t } = useTranslation();
  const { theme, setTheme, settings, refreshSettings, previewSettings, setLanguage } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>('company');
  const [loading, setLoading] = useState(false);
  
  const currentUser = getStoredUser();
  const [backups, setBackups] = useState<any[]>([]);
  const [fetchingBackups, setFetchingBackups] = useState(false);
  const [triggeringBackup, setTriggeringBackup] = useState(false);
  const [showHardwareGuide, setShowHardwareGuide] = useState(false);

  const { 
    data: formData, 
    updateDraft: setFormData,
    clearDraft
  } = usePersistentDraft('settings_drafts', currentUser?.id || 'anonymous_admin', {
    companyName: '',
    subtitle: '',
    companyLogoUrl: '',
    primaryColor: '',
    secondaryColor: '',
    accentColor: '',
    bgMain: '',
    bgCard: '',
    bgElevated: '',
    bgInput: '',
    borderSubtle: '',
    textPrimary: '',
    textSecondary: '',
    textMuted: '',
    textInverse: '',
    sidebarBg: '',
    sidebarActive: '',
    sidebarText: '',
    idCardShowLogo: true,
    idCardShowQrCode: true,
    idCardOrientation: 'VERTICAL',
    defaultLanguage: 'en',
    currency: 'GHS',
    successColor: 'var(--success)',
    warningColor: 'var(--warning)',
    errorColor: 'var(--error)',
    infoColor: 'var(--info)',
    vatRate: 0,
    allowSelfRegistration: true,
    themePreset: 'premium-monolith' as ThemeName,
    address: '',
    phone: '',
    email: '',
    city: '',
    country: '',
    isAiEnabled: false,
    defaultLeaveAllowance: 24,
    allowLeaveCarryForward: true,
    allowLeaveBorrowing: false,
    carryForwardLimit: 10,
    borrowingLimit: 5,
    ssnitRate: 0.055,
    employerSsnitRate: 0.13,
    payeBands: [
      { limit: 490,      rate: 0.00  },
      { limit: 110,      rate: 0.05  },
      { limit: 130,      rate: 0.10  },
      { limit: 3166.67,  rate: 0.175 },
      { limit: 16000,    rate: 0.25  },
      { limit: 30520,    rate: 0.30  },
      { limit: 999999999, rate: 0.35  },
    ],
    idCardPrimaryColor: '#009EE3',
    idCardAccentColor: '#EE7100',
    idCardTheme: 'DARK',
    idCardBackMessage: '',
    idCardSecurityText: 'Operational Framework & Terms'
  });

  // Initialize form data from settings only once to prevent overwriting user drafts
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (settings && !initialized) {
      setFormData({
        ...formData,
        ...settings,
        companyName: settings.name || '',
        idCardPrimaryColor: settings.idCardPrimaryColor || '#009EE3',
        idCardAccentColor: settings.idCardAccentColor || '#EE7100',
        idCardOrientation: settings.idCardOrientation || 'VERTICAL',
        idCardTheme: settings.idCardTheme || 'DARK',
        idCardShowLogo: settings.idCardShowLogo ?? true,
        idCardShowQrCode: settings.idCardShowQrCode ?? true,
        idCardBackMessage: settings.idCardBackMessage || '',
        idCardSecurityText: settings.idCardSecurityText || 'Terms of Use'
      });
      setInitialized(true);
    }
  }, [settings, initialized]);

  useEffect(() => {
    if (activeTab === 'branding') {
      previewSettings(formData as any);
    }
    const currentRank = currentUser?.rank || 0;
    if (activeTab === 'data' && currentRank >= 85) {
      fetchBackups();
    }
  }, [formData, activeTab, previewSettings, currentUser]);

  const fetchBackups = async () => {
    setFetchingBackups(true);
    try {
      const res = await api.get('/maintenance/backups');
      setBackups(res.data);
    } catch (err) {
      console.error(t('settings.fetch_vault_error'));
    } finally {
      setFetchingBackups(false);
    }
  };

  const handleManualBackup = async () => {
    setTriggeringBackup(true);
    try {
      await api.post('/maintenance/backup');
      toast.success(t('settings.backup_success'));
      fetchBackups();
    } catch (err) {
      toast.error(t('settings.backup_error'));
    } finally {
      setTriggeringBackup(false);
    }
  };

  const handleDownload = async (filename: string) => {
    try {
      const res = await api.get(`/maintenance/backups/${filename}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error(t('settings.uplink_error'));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/settings', formData);
      // Update organization default AND user preference lock
      setLanguage(formData.defaultLanguage || 'en');
      toast.success(t('settings.update_success'));
      
      // Permanent Identity Sync to Firebase (Non-blocking)
      const syncOrgId = currentUser?.organizationId || 'default-tenant';
      BrandingService.updateBranding(syncOrgId, {
        name: formData.companyName,
        companyLogoUrl: formData.companyLogoUrl,
        primaryColor: formData.primaryColor,
        accentColor: formData.accentColor,
        themePreset: formData.themePreset,
        bgMain: formData.bgMain,
        bgCard: formData.bgCard,
        bgElevated: formData.bgElevated,
        bgInput: formData.bgInput,
        borderSubtle: formData.borderSubtle,
        textPrimary: formData.textPrimary,
        textSecondary: formData.textSecondary,
        textMuted: formData.textMuted,
        textInverse: formData.textInverse,
        sidebarBg: formData.sidebarBg,
        sidebarActive: formData.sidebarActive,
        sidebarText: formData.sidebarText,
        // Status Colors
        successColor: formData.successColor,
        warningColor: formData.warningColor,
        errorColor: formData.errorColor,
        infoColor: formData.infoColor,
        // ID Card Tokens
        idCardPrimaryColor: formData.idCardPrimaryColor,
        idCardAccentColor: formData.idCardAccentColor,
        idCardShowLogo: formData.idCardShowLogo,
        idCardShowQrCode: formData.idCardShowQrCode,
        idCardOrientation: formData.idCardOrientation as any,
        idCardTheme: formData.idCardTheme as any,
        idCardBackMessage: formData.idCardBackMessage,
        idCardSecurityText: formData.idCardSecurityText
      }).catch(e => console.warn('[SettingsHub] Branding sync failed:', e));
      
      await refreshSettings();
      await clearDraft();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('common.error_updating_settings'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      // 🚀 SURVIVAL ARCHITECTURE: Optimize & Upload to Backend
      // This ensures the logo is stored in the DB (Base64 fallback) or Cloud
      // bypassing ephemeral disk issues on Render.
      const optimizedBase64 = await optimizeImage(file, { maxWidth: 500, maxHeight: 500, quality: 0.8 });
      
      const res = await api.post('/upload/logo', { image: optimizedBase64 });
      const logoUrl = res.data.logoUrl;

      // 2. Update Local State & Persist
      const updatedData = { ...formData, companyLogoUrl: logoUrl };
      setFormData(updatedData);
      
      // 🚀 PERSISTENCE SYNC: Immediately save to DB to avoid "disappearing" on refresh
      await api.put('/settings', updatedData);
      toast.success(t('settings.identity_sync_success'));

      // 3. Identity broadcast to all devices
      const syncOrgId = currentUser?.organizationId || 'default-tenant';
      await BrandingService.updateBranding(syncOrgId, {
        companyLogoUrl: logoUrl
      });

      await refreshSettings();
    } catch (err: any) {
      console.error('[Branding] Persistence sync failed:', err);
      toast.error(t('settings.identity_sync_error'));
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: any; description: string }[] = [
    { id: 'company', label: t('settings.company_profile'), icon: Building2, description: t('settings.company_description', 'Basic organization details and structure.') },
    { id: 'leave', label: t('leave.management', 'Leave Management'), icon: Calendar, description: t('leave.settings_description', 'Define global leave allowances, carry-forward rules, and borrowing policies.') },
    { id: 'branding', label: t('settings.branding'), icon: Palette, description: t('settings.branding_description', 'Visual identity, logos, and theme presets.') },
    { id: 'id_cards', label: 'Personnel ID Cards', icon: ShieldCheck, description: 'Manage the design, orientation, and security features of physical employee tags.' },
    { id: 'localization', label: t('settings.localization'), icon: Globe, description: t('settings.localization_description', 'Language, currency, and regional formats.') },
    { id: 'security', label: t('settings.security'), icon: Shield, description: t('settings.security_description', 'Authentication, roles, and access control.') },
    { id: 'notifications', label: t('settings.notifications'), icon: Bell, description: t('settings.notifications_description', 'Email and system alert preferences.') },
    { id: 'billing', label: t('settings.billing'), icon: CreditCard, description: t('settings.billing_description', 'Subscription plans and payment history.') },
    { id: 'data', label: t('settings.data_management'), icon: Download, description: t('settings.data_description', 'Export history, backups, and data privacy.') },
    { id: 'integrations', label: t('settings.integrations', 'API & Integrations'), icon: Sparkles, description: t('settings.integrations_desc', 'API Keys, Webhooks, and connected platforms.') },
    { id: 'payroll', label: t('payroll.settings', 'Payroll Settings'), icon: CreditCard, description: t('payroll.settings_desc', 'Configure SSNIT rates, PAYE tax bands, and global payroll rules.') },
    { id: 'infrastructure', label: t('settings.infrastructure', 'Hardware & Nodes'), icon: Server, description: t('settings.infrastructure_desc', 'Connect QR/NFC devices and manage institutional hardware nodes.') },
  ];

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 pb-32">
      {/* Sidebar Nav */}
      <div className="w-full lg:w-72 shrink-0">
        <div className="mb-8 px-4">
          <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">{t('common.settings')}</h2>
          <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-2 opacity-60">{t('settings.system_config')}</p>
        </div>
        
        <div className="space-y-1.5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group relative overflow-hidden",
                activeTab === tab.id 
                  ? "bg-[var(--bg-card)] shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-[var(--border-subtle)]" 
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-card)]/40 hover:text-[var(--text-primary)]"
              )}
            >
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute left-0 w-1 h-6 bg-[var(--primary)] rounded-r-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <tab.icon size={20} className={cn(
                "transition-colors",
                activeTab === tab.id ? "text-[var(--primary)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
              )} />
              <div className="text-left flex-1">
                <p className="text-[14px] font-bold tracking-tight">{tab.label}</p>
              </div>
              <ChevronRight size={14} className={cn(
                "transition-all",
                activeTab === tab.id ? "text-[var(--primary)] translate-x-0" : "text-[var(--text-muted)] -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"
              )} />
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1">
        <div className="nx-card p-10 lg:p-14 min-h-[700px] border-[var(--border-subtle)] shadow-[0_30px_60px_rgba(0,0,0,0.02)] relative overflow-hidden">
          {/* Subtle Background Glow */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[var(--primary)]/5 blur-[120px] rounded-full pointer-events-none" />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="relative z-10"
            >
              <div className="mb-12">
                <h3 className="text-3xl font-black text-[var(--text-primary)] tracking-tight capitalize">
                  {tabs.find(t => t.id === activeTab)?.label}
                </h3>
                <p className="text-[var(--text-secondary)] mt-3 text-[15px] font-medium leading-relaxed max-w-2xl">
                  {tabs.find(t => t.id === activeTab)?.description}
                </p>
              </div>

              <div className="space-y-16">
                {activeTab === 'branding' && (
                  <div className="space-y-16">
                    <section>
                      <div className="flex items-center justify-between mb-8">
                        <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">{t('settings.appearance_theme', 'Appearance & Theme')}</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {THEMES.map(preset => (
                          <button
                            key={preset.id}
                            onClick={() => {
                              const presetDefaults: Record<ThemeName, Partial<typeof formData>> = {
                                  'premium-monolith': {
                                    primaryColor: '#a855f7', secondaryColor: '#18181b', accentColor: '#06b6d4', 
                                    bgMain: '#09090b', bgCard: '#121215', bgElevated: '#18181b', bgInput: '#09090b', borderSubtle: 'rgba(255,255,255,0.05)',
                                    textPrimary: '#fafafa', textSecondary: '#a1a1aa', textMuted: '#71717a', textInverse: '#ffffff',
                                    sidebarBg: '#09090b', sidebarActive: '#27272a', sidebarText: '#fafafa'
                                  },
                                  'premium-canvas': {
                                    primaryColor: '#009EE3', secondaryColor: '#9C9C9C', accentColor: '#EE7100', 
                                    bgMain: '#f8fafc', bgCard: '#ffffff', bgElevated: '#f1f5f9', bgInput: '#ffffff', borderSubtle: 'rgba(0,0,0,0.08)',
                                    textPrimary: '#0f172a', textSecondary: '#475569', textMuted: '#94a3b8', textInverse: '#ffffff',
                                    sidebarBg: '#ffffff', sidebarActive: 'rgba(0, 158, 227, 0.08)', sidebarText: '#475569'
                                  },
                                  'premium-aero': {
                                    primaryColor: '#009EE3', secondaryColor: '#f1f5f9', accentColor: '#EE7100', 
                                    bgMain: '#ffffff', bgCard: '#ffffff', bgElevated: '#f1f5f9', bgInput: '#ffffff', borderSubtle: 'rgba(0, 158, 227, 0.08)',
                                    textPrimary: '#1e293b', textSecondary: '#475569', textMuted: '#94a3b8', textInverse: '#ffffff',
                                    sidebarBg: '#0f172a', sidebarActive: '#1e293b', sidebarText: '#ffffff'
                                  }
                                };
                              setTheme(preset.id);
                              setFormData({ ...formData, ...presetDefaults[preset.id], themePreset: preset.id });
                            }}
                            className={cn(
                              "group p-6 rounded-[2rem] border-2 text-left transition-all relative overflow-hidden",
                              theme === preset.id 
                                ? "border-[var(--primary)] bg-[var(--bg-main)] shadow-xl shadow-[var(--primary)]/5" 
                                : "border-transparent bg-[var(--bg-elevated)] hover:bg-[var(--bg-main)] hover:border-[var(--border-strong)]/20"
                            )}
                          >
                            <div className="flex items-center justify-between mb-6">
                              <div className={cn(
                                "w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-transform group-hover:scale-110 duration-500",
                                theme === preset.id ? "bg-[var(--primary)]/10" : "bg-white/10"
                              )}>
                                {preset.emoji}
                              </div>
                              {theme === preset.id && (
                                <div className="w-6 h-6 bg-[var(--primary)] rounded-full flex items-center justify-center shadow-lg shadow-[var(--primary)]/30">
                                  <Check size={14} className="text-white" />
                                </div>
                              )}
                            </div>
                            <p className="font-bold text-lg text-[var(--text-primary)] tracking-tight">{preset.label}</p>
                            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mt-2 font-black opacity-60">
                              {preset.dark ? t('settings.dark_interface', 'Dark Interface') : t('settings.light_interface', 'Light Interface')}
                            </p>
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="p-10 rounded-[2.5rem] bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] relative">
                      <div className="flex items-center justify-between mb-10">
                        <div>
                          <h4 className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-3">
                            <Palette size={16} className="text-[var(--primary)]" /> {t('settings.custom_design_tokens', 'Custom Design Tokens')}
                          </h4>
                        </div>
                        <button 
                          onClick={() => setFormData({
                            ...formData,
                            primaryColor: '', secondaryColor: '', accentColor: '',
                            bgMain: '', bgCard: '', textPrimary: '', textSecondary: '', textMuted: '',
                            sidebarBg: '', sidebarActive: '', sidebarText: ''
                          })}
                          className="text-[10px] font-bold px-4 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all uppercase tracking-widest"
                        >
                          {t('settings.restore_standards', 'Restore Standards')}
                        </button>
                      </div>

                      <div className="space-y-12">
                        {/* Group 1: Brand & Key Colors */}
                        <div>
                          <h5 className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest mb-6 opacity-80 pl-1">{t('settings.groups.brand')}</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                             {[
                               { id: 'primaryColor', label: t('settings.colors.primary', 'Primary Brand') },
                               { id: 'accentColor', label: t('settings.colors.accent', 'Accent Highlight') },
                               { id: 'textInverse', label: t('settings.colors.textInverse', 'Inverse Text') },
                             ].map(color => (
                               <ColorPicker key={color.id} id={color.id} label={color.label} value={(formData as any)[color.id]} onChange={val => setFormData({...formData, [color.id]: val})} />
                             ))}
                          </div>
                        </div>

                        {/* Functional Status Colors */}
                        <div>
                          <h5 className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest mb-6 opacity-80 pl-1">{t('settings.groups.functional', 'Status & Feedback')}</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                             {[
                               { id: 'successColor', label: t('settings.colors.success', 'Success (Green)') },
                               { id: 'warningColor', label: t('settings.colors.warning', 'Warning (Amber)') },
                               { id: 'errorColor', label: t('settings.colors.error', 'Error (Red)') },
                               { id: 'infoColor', label: t('settings.colors.info', 'Information (Blue)') },
                             ].map(color => (
                               <ColorPicker key={color.id} id={color.id} label={color.label} value={(formData as any)[color.id]} onChange={val => setFormData({...formData, [color.id]: val})} />
                             ))}
                          </div>
                        </div>

                        {/* Group 2: Surfaces & Borders */}
                        <div>
                          <h5 className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest mb-6 opacity-80 pl-1">{t('settings.groups.surfaces', 'Surfaces & Layout')}</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                             {[
                               { id: 'bgMain', label: t('settings.colors.bgMain', 'Main Canvas') },
                               { id: 'bgCard', label: t('settings.colors.bgCard', 'Surface Card') },
                               { id: 'bgElevated', label: t('settings.colors.bgElevated', 'Elevated Layer') },
                               { id: 'bgInput', label: t('settings.colors.bgInput', 'Input Field') },
                               { id: 'borderSubtle', label: t('settings.colors.borderSubtle', 'Subtle Border') },
                               { id: 'secondaryColor', label: t('settings.colors.secondary', 'Secondary UI') },
                             ].map(color => (
                               <ColorPicker key={color.id} id={color.id} label={color.label} value={(formData as any)[color.id]} onChange={val => setFormData({...formData, [color.id]: val})} />
                             ))}
                          </div>
                        </div>

                        {/* Group 3: Typography */}
                        <div>
                          <h5 className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest mb-6 opacity-80 pl-1">{t('settings.groups.typography', 'Typography')}</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                             {[
                               { id: 'textPrimary', label: t('settings.colors.textPrimary', 'Deep Text') },
                               { id: 'textSecondary', label: t('settings.colors.textSecondary', 'Mid-Text') },
                               { id: 'textMuted', label: t('settings.colors.textMuted', 'Soft Text') },
                             ].map(color => (
                               <ColorPicker key={color.id} id={color.id} label={color.label} value={(formData as any)[color.id]} onChange={val => setFormData({...formData, [color.id]: val})} />
                             ))}
                          </div>
                        </div>

                        {/* Group 4: Sidebar & Navigation Layout */}
                        <div>
                          <h5 className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest mb-6 opacity-80 pl-1">{t('settings.groups.sidebar', 'Sidebar & Navigation')}</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                             {[
                               { id: 'sidebarBg', label: t('settings.colors.sidebarBg', 'Sidebar Background') },
                               { id: 'sidebarActive', label: t('settings.colors.sidebarActive', 'Active Nav Item') },
                               { id: 'sidebarText', label: t('settings.colors.sidebarText', 'Active Nav Text') },
                             ].map(color => (
                               <ColorPicker key={color.id} id={color.id} label={color.label} value={(formData as any)[color.id]} onChange={val => setFormData({...formData, [color.id]: val})} />
                             ))}
                          </div>
                        </div>
                      </div>
                    </section>


                    {/* Official Identity — Logo Upload */}
                    <section className="p-10 rounded-[2.5rem] bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)] relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-10 transition-opacity"><Building2 size={120} /></div>
                       <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
                          <Globe size={16} className="text-[var(--primary)]" /> {t('settings.labels.company_logo', 'Corporate Identity (Logo)')}
                       </h4>
                       
                       <div className="flex flex-col md:flex-row items-center gap-12">
                          <div className="w-40 h-40 rounded-[2.5rem] bg-[var(--bg-card)] border-2 border-dashed border-[var(--border-subtle)] flex items-center justify-center relative group/logo overflow-hidden">
                             {getLogoUrl(formData.companyLogoUrl) ? (
                               <img src={getLogoUrl(formData.companyLogoUrl) as string} className="w-full h-full object-contain p-6" alt="Logo" />
                             ) : (
                               <Building2 size={40} className="text-[var(--text-muted)] opacity-20" />
                             )}
                             <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/logo:opacity-100 flex items-center justify-center cursor-pointer transition-all">
                                <Plus className="text-white" size={32} />
                                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                             </label>
                          </div>
                          <div className="flex-1 space-y-4">
                             <p className="text-[14px] font-black text-[var(--text-primary)] uppercase tracking-tight">{t('settings.upload_identity', 'Upload Official Identity')}</p>
                             <p className="text-[11px] text-[var(--text-muted)] font-medium max-w-sm leading-relaxed">Ensure your logo has a transparent background for optimal rendering across all UI modes. Supported: SVG, PNG, WebP.</p>
                          </div>
                       </div>
                    </section>
                  </div>
                )}

                {activeTab === 'id_cards' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    <div className="lg:col-span-7 space-y-12 text-left">
                      {/* --- MODULE 1: AESTHETIC STANDARDS --- */}
                      <section className="p-12 rounded-[3rem] border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-sm">
                         <div className="flex items-center gap-6 mb-12">
                            <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-[1.5rem] flex items-center justify-center text-[var(--primary)] shadow-inner">
                                <Palette size={32} />
                            </div>
                            <div>
                               <h4 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Design & Style</h4>
                               <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">Colors and Themes</p>
                            </div>
                         </div>

                         <div className="space-y-12">
                            {/* Color Strategy */}
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 p-10 rounded-[2.5rem] bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)]">
                                <ColorPicker 
                                    id="idCardPrimaryColor" 
                                    label="Primary ID Color" 
                                    value={formData.idCardPrimaryColor || '#009EE3'} 
                                    onChange={val => setFormData({...formData, idCardPrimaryColor: val})} 
                                />
                                <ColorPicker 
                                    id="idCardAccentColor" 
                                    label="Status Border Color" 
                                    value={formData.idCardAccentColor || '#EE7100'} 
                                    onChange={val => setFormData({...formData, idCardAccentColor: val})} 
                                />
                            </div>

                            {/* Theme Presets */}
                            <div className="space-y-6">
                               <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">Ready-made Designs</label>
                               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                 {[
                                   { id: 'mcb', label: 'MCB Dark', primary: '#009EE3', accent: '#EE7100', theme: 'DARK' },
                                   { id: 'pristine', label: 'Classic White', primary: '#009EE3', accent: '#EE7100', theme: 'PRISTINE' },
                                   { id: 'slate', label: 'Slate Gray', primary: '#1e293b', accent: '#64748b', theme: 'DARK' },
                                   { id: 'ocean', label: 'Ocean Blue', primary: '#0ea5e9', accent: '#7dd3fc', theme: 'LIGHT' },
                                 ].map((preset) => (
                                   <button
                                     key={preset.id}
                                     onClick={() => setFormData({
                                       ...formData, 
                                       idCardPrimaryColor: preset.primary, 
                                       idCardAccentColor: preset.accent, 
                                       idCardTheme: preset.theme as any
                                     })}
                                     className={cn(
                                       "p-6 rounded-[1.5rem] border-2 transition-all text-left group relative overflow-hidden min-h-[120px] flex flex-col justify-between",
                                       formData.idCardPrimaryColor === preset.primary && formData.idCardTheme === preset.theme ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border-subtle)] hover:border-[var(--primary)]/30"
                                     )}
                                   >
                                     <div className="flex gap-1.5">
                                       <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: preset.primary }} />
                                       <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: preset.accent }} />
                                     </div>
                                     <p className="text-[11px] font-black text-[var(--text-primary)] leading-tight mt-4">{preset.label}</p>
                                   </button>
                                 ))}
                               </div>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                                {/* Base Mode */}
                                <div className="space-y-6">
                                   <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">Background Theme</label>
                                   <div className="grid grid-cols-3 gap-2 p-1.5 bg-[var(--bg-elevated)]/50 rounded-[1.5rem] border border-[var(--border-subtle)]">
                                      {['DARK', 'LIGHT', 'PRISTINE'].map(m => (
                                         <button 
                                            key={m}
                                            onClick={() => setFormData({...formData, idCardTheme: m as any})}
                                            className={cn(
                                               "py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", 
                                               formData.idCardTheme === m 
                                                ? "bg-[var(--primary)] text-white shadow-lg" 
                                                : "text-[var(--text-muted)] hover:bg-[var(--bg-card)]"
                                            )}
                                         >{m === 'PRISTINE' ? 'White' : m}</button>
                                      ))}
                                   </div>
                                </div>

                                {/* Orientation */}
                                <div className="space-y-6">
                                   <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">Card Shape</label>
                                   <div className="grid grid-cols-2 gap-2 p-1.5 bg-[var(--bg-elevated)]/50 rounded-[1.5rem] border border-[var(--border-subtle)]">
                                      <button 
                                         onClick={() => setFormData({...formData, idCardOrientation: 'VERTICAL'})}
                                         className={cn("py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", formData.idCardOrientation === 'VERTICAL' ? "bg-indigo-600 text-white shadow-lg" : "text-[var(--text-muted)] hover:bg-[var(--bg-card)]")}
                                      >Tall (Portrait)</button>
                                      <button 
                                         onClick={() => setFormData({...formData, idCardOrientation: 'HORIZONTAL'})}
                                         className={cn("py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", formData.idCardOrientation === 'HORIZONTAL' ? "bg-indigo-600 text-white shadow-lg" : "text-[var(--text-muted)] hover:bg-[var(--bg-card)]")}
                                      >Wide (Landscape)</button>
                                   </div>
                                </div>
                            </div>
                         </div>
                       </section>
                      <section className="p-12 rounded-[3rem] border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-sm">
                         <div className="flex items-center gap-6 mb-12">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-[1.5rem] flex items-center justify-center text-emerald-600 shadow-inner">
                                <ShieldCheck size={32} />
                            </div>
                            <div>
                               <h4 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Card Features</h4>
                               <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">Logo and Scanner Settings</p>
                            </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center justify-between p-8 rounded-[2rem] bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)] group hover:border-emerald-500/30 transition-all">
                               <div>
                                  <p className="text-[14px] font-black text-[var(--text-primary)]">Show Company Logo</p>
                                  <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase mt-1 tracking-wider">Visible on card front</p>
                               </div>
                               <input 
                                 type="checkbox" 
                                 className="toggle-checkbox" 
                                 checked={formData.idCardShowLogo}
                                 onChange={e => setFormData({...formData, idCardShowLogo: e.target.checked})}
                               />
                            </div>

                            <div className="flex items-center justify-between p-8 rounded-[2rem] bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)] group hover:border-emerald-500/30 transition-all">
                               <div>
                                  <p className="text-[14px] font-black text-[var(--text-primary)]">Attendance QR Code</p>
                                  <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase mt-1 tracking-wider">For clock-in scans</p>
                               </div>
                               <input 
                                 type="checkbox" 
                                 className="toggle-checkbox" 
                                 checked={formData.idCardShowQrCode}
                                 onChange={e => setFormData({...formData, idCardShowQrCode: e.target.checked})}
                               />
                            </div>
                         </div>
                      </section>

                      {/* --- MODULE 3: INSTITUTIONAL METADATA --- */}
                      <section className="p-12 rounded-[3rem] border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-sm">
                         <div className="flex items-center gap-6 mb-12">
                            <div className="w-16 h-16 bg-blue-500/10 rounded-[1.5rem] flex items-center justify-center text-blue-600 shadow-inner">
                                <Mail size={32} />
                            </div>
                            <div>
                               <h4 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Institutional Info</h4>
                               <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">Ownership & Legal Terms</p>
                            </div>
                         </div>

                         <div className="space-y-10">
                            <div className="space-y-6">
                               <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">Back Side Title</label>
                               <input 
                                 type="text"
                                 className="w-full bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] rounded-[1.5rem] px-8 py-5 text-sm font-black text-[var(--text-primary)] focus:border-[var(--primary)] outline-none shadow-inner transition-all"
                                 placeholder="Terms of Use"
                                 value={formData.idCardSecurityText}
                                 onChange={e => setFormData({...formData, idCardSecurityText: e.target.value})}
                               />
                            </div>

                            <div className="space-y-6">
                               <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">Ownership Statement</label>
                               <textarea 
                                 className="w-full bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] rounded-[2rem] px-8 py-6 text-sm font-bold leading-relaxed text-[var(--text-primary)] focus:border-[var(--primary)] outline-none min-h-[160px] resize-none shadow-inner transition-all"
                                 placeholder="This card belongs to..."
                                 value={formData.idCardBackMessage}
                                 onChange={e => setFormData({...formData, idCardBackMessage: e.target.value})}
                               />
                               <div className="p-6 rounded-[1.5rem] bg-indigo-500/5 border border-indigo-500/10">
                                 <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest leading-relaxed">
                                   Note: Default statement will append organization hub address automatically if left blank.
                                 </p>
                               </div>
                            </div>
                         </div>
                      </section>
                    </div>

                    <div className="lg:col-span-5">
                       <div className="sticky top-12 space-y-8">
                          <div className="text-center space-y-4">
                             <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">Identity Real-time Preview</h4>
                             <div className="p-8 bg-[var(--bg-elevated)]/30 rounded-[3rem] border border-[var(--border-subtle)] border-dashed overflow-hidden flex justify-center items-center min-h-[480px]">
                                <div className={cn("transition-all duration-700 origin-center scale-[0.65] lg:scale-[0.7]")}>
                                <EmployeeIDCard 
                                  employee={{ 
                                    fullName: currentUser?.fullName || 'John Doe', 
                                    jobTitle: currentUser?.jobTitle || 'Executive Personnel', 
                                    employeeCode: currentUser?.employeeCode || 'MCB-001-GH',
                                    avatarUrl: currentUser?.avatarUrl,
                                    departmentObj: { name: 'EXECUTIVE_HUB' },
                                    email: currentUser?.email || 'j.doe@mcb-ghana.com'
                                  }} 
                                  organization={{
                                    ...settings,
                                    name: formData.companyName,
                                    logoUrl: getLogoUrl(formData.companyLogoUrl) as string,
                                    idCardPrimaryColor: formData.idCardPrimaryColor,
                                    idCardAccentColor: formData.idCardAccentColor,
                                    idCardTheme: formData.idCardTheme,
                                    idCardOrientation: formData.idCardOrientation,
                                    idCardShowLogo: formData.idCardShowLogo,
                                    idCardShowQrCode: formData.idCardShowQrCode,
                                    idCardBackMessage: formData.idCardBackMessage,
                                    idCardSecurityText: formData.idCardSecurityText
                                  }} 
                                />
                                 </div>
                              </div>
                              <div className="flex flex-col items-center gap-2">
                                 <p className="text-[11px] font-black text-[var(--primary)] uppercase tracking-widest">CR80 ISO Standard: 85.6mm × 54.0mm</p>
                                 <p className="text-[10px] font-medium text-[var(--text-muted)] italic leading-relaxed">High-fidelity 300 DPI Physical Print Representation.</p>
                              </div>
                          </div>

                          <div className="p-8 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 text-left">
                             <div className="flex items-center gap-3 text-amber-600 mb-4">
                                <AlertTriangle size={18} />
                                <h5 className="text-[11px] font-black uppercase tracking-widest">Hardware Dependency</h5>
                             </div>
                             <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                                Ensure your physical card printers support high-fidelity edge-to-edge printing. For Node QR features, ensure the IT Hub "Infrastructure" keys are configured correctly.
                             </p>
                          </div>
                       </div>
                    </div>
                  </div>
                )}

                {activeTab === 'company' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-10">
                      <section className="space-y-6">
                        <h4 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-60">{t('settings.general_info', 'General Information')}</h4>
                        <div className="space-y-8">
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-3 uppercase tracking-widest pl-1">{t('settings.labels.company_name', 'Company Name')}</label>
                            <input 
                              type="text" 
                              className="w-full bg-transparent border-b-2 border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none text-[15px] font-semibold py-3 transition-all"
                              value={formData.companyName}
                              onChange={e => setFormData({...formData, companyName: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-3 uppercase tracking-widest pl-1">{t('settings.labels.platform_subtitle', 'Platform Subtitle')}</label>
                            <input 
                              type="text" 
                              className="w-full bg-transparent border-b-2 border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none text-[15px] font-semibold py-3 transition-all"
                              value={formData.subtitle}
                              onChange={e => setFormData({...formData, subtitle: e.target.value})}
                            />
                          </div>
                        </div>
                      </section>
                      
                      <section className="p-8 rounded-[2.5rem] bg-[var(--primary)]/5 border border-[var(--primary)]/10">
                        <div className="flex items-center justify-between p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-sm hover:border-[var(--primary)]/30 transition-all group">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] group-hover:scale-110 transition-transform">
                              <Sparkles size={24} />
                            </div>
                            <div>
                               <p className="text-[14px] font-black uppercase tracking-tight text-[var(--text-primary)]">{t('settings.enable_ai', 'MCB Pulse AI Advisor')}</p>
                               <p className="text-[10px] text-[var(--text-muted)] font-bold mt-1 uppercase tracking-widest opacity-60">{t('settings.enable_ai_desc', 'Strategic insights & intelligent automation')}</p>
                            </div>
                          </div>
                          <input 
                             type="checkbox" 
                             className="toggle-checkbox" 
                             checked={formData.isAiEnabled}
                             onChange={e => setFormData({...formData, isAiEnabled: e.target.checked})}
                          />
                        </div>
                        {!formData.isAiEnabled && (
                           <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                             <AlertTriangle size={14} />
                             <p className="text-[10px] font-black uppercase tracking-widest">Strategic Advisory Mode is currently deactivated</p>
                           </div>
                        )}
                      </section>

                      {/* Official Contact Details for White-Labeling */}
                      <section className="space-y-8 bg-[var(--bg-elevated)]/30 p-8 rounded-[2.5rem] border border-[var(--border-subtle)]">
                        <h4 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-60 flex items-center gap-2">
                          <Globe size={14} className="text-[var(--primary)]" /> {t('settings.contact_details')}
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-3 uppercase tracking-widest pl-1">{t('settings.labels.official_address')}</label>
                            <input 
                              type="text" 
                              className="w-full bg-transparent border-b-2 border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none text-[15px] font-semibold py-3 transition-all"
                              placeholder="e.g. 123 Business Ave, Suite 100"
                              value={formData.address}
                              onChange={e => setFormData({...formData, address: e.target.value})}
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-3 uppercase tracking-widest pl-1">{t('settings.labels.official_phone')}</label>
                            <input 
                              type="text" 
                              className="w-full bg-transparent border-b-2 border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none text-[15px] font-semibold py-3 transition-all"
                              placeholder="+224 ..."
                              value={formData.phone}
                              onChange={e => setFormData({...formData, phone: e.target.value})}
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-3 uppercase tracking-widest pl-1">{t('settings.labels.official_email')}</label>
                            <input 
                              type="email" 
                              className="w-full bg-transparent border-b-2 border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none text-[15px] font-semibold py-3 transition-all"
                              placeholder="hr@company.com"
                              value={formData.email}
                              onChange={e => setFormData({...formData, email: e.target.value})}
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-3 uppercase tracking-widest pl-1">{t('settings.labels.city')}</label>
                            <input 
                              type="text" 
                              className="w-full bg-transparent border-b-2 border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none text-[15px] font-semibold py-3 transition-all"
                              value={formData.city}
                              onChange={e => setFormData({...formData, city: e.target.value})}
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-3 uppercase tracking-widest pl-1">{t('settings.labels.country')}</label>
                            <input 
                              type="text" 
                              className="w-full bg-transparent border-b-2 border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none text-[15px] font-semibold py-3 transition-all"
                              value={formData.country}
                              onChange={e => setFormData({...formData, country: e.target.value})}
                            />
                          </div>
                        </div>
                      </section>
                    </div>

                    <div className="space-y-8">
                      <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">{t('settings.labels.company_logo')}</h4>
                      <div className="p-12 border-2 border-dashed border-[var(--border-subtle)] rounded-[3rem] flex flex-col items-center justify-center bg-[var(--bg-elevated)]/30 group hover:bg-[var(--bg-elevated)]/50 transition-all duration-500 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[var(--primary)]/5 opacity-0 group-hover:opacity-10 transition-opacity blur-3xl pointer-events-none" />
                        
                        <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full relative z-10">
                          {getLogoUrl(formData.companyLogoUrl) ? (
                            <img 
                              src={getLogoUrl(formData.companyLogoUrl) as string} 
                              className="h-24 mb-8 object-contain drop-shadow-2xl" 
                              alt="Logo preview" 
                            />
                          ) : (
                            <Building2 size={48} className="text-[var(--text-muted)] mb-8 opacity-20" />
                          )}
                          
                          <div className="px-6 py-2 rounded-xl bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--primary)]/20 group-hover:scale-105 transition-transform">
                            {formData.companyLogoUrl ? t('settings.change_design') : t('settings.upload_identity')}
                          </div>
                          
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleLogoUpload}
                          />
                        </label>
                        <p className="text-[10px] text-[var(--text-muted)] mt-6 font-bold uppercase tracking-widest opacity-50 relative z-10">SVG, PNG or WEBP (Max 5MB)</p>
                      </div>

                    </div>
                  </div>
                )}

                {activeTab === 'leave' && (
                  <div className="max-w-2xl">
                    <section className="space-y-10 bg-[var(--primary)]/5 p-10 rounded-[2.5rem] border border-[var(--primary)]/10">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] shadow-sm">
                          <Calendar size={24} />
                        </div>
                        <div>
                          <h4 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight">{t('settings.leave_policy', 'Company Leave Policy')}</h4>
                          <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-60">{t('settings.leave_policy_desc', 'Configure core accrual vectors')}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-12">
                        <div className="p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                          <label className="block text-[10px] font-black text-[var(--text-muted)] mb-4 uppercase tracking-[0.2em] ml-1">{t('settings.labels.global_allowance', 'Global Annual Allowance (Days)')}</label>
                          <div className="flex items-center gap-6">
                            <input 
                              type="number" 
                              className="bg-transparent border-b-4 border-[var(--primary)]/30 focus:border-[var(--primary)] outline-none text-[42px] font-black py-2 transition-all w-32 text-center"
                              value={formData.defaultLeaveAllowance}
                              onChange={e => setFormData({...formData, defaultLeaveAllowance: parseInt(e.target.value) || 0})}
                            />
                            <div className="flex-1">
                               <p className="text-[13px] font-bold text-[var(--text-secondary)]">{t('settings.allowance_hint', 'Total standard days granted per cycle.')}</p>
                               <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">{t('settings.allowance_subhint', 'Individual overrides can be set in employee profiles.')}</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                          <div className="p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col gap-6 group hover:border-[var(--primary)]/30 transition-all">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                 <RefreshCw size={18} className="text-[var(--primary)] opacity-40 group-hover:opacity-100 transition-opacity" />
                                 <span className="text-[14px] font-black uppercase tracking-tight">{t('settings.allow_carry_forward', 'Carry-Forward')}</span>
                              </div>
                              <input 
                                type="checkbox" 
                                className="toggle-checkbox" 
                                checked={formData.allowLeaveCarryForward}
                                onChange={e => setFormData({...formData, allowLeaveCarryForward: e.target.checked})}
                              />
                            </div>
                            <AnimatePresence>
                              {formData.allowLeaveCarryForward && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }} 
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="pt-6 border-t border-[var(--border-subtle)] space-y-4"
                                >
                                  <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60 ml-1">Limit (Days)</label>
                                  <input 
                                    type="number" 
                                    className="bg-transparent border-b-2 border-[var(--primary)] focus:border-[var(--primary)] outline-none text-2xl font-black w-full py-2"
                                    value={formData.carryForwardLimit}
                                    onChange={e => setFormData({...formData, carryForwardLimit: parseInt(e.target.value) || 0})}
                                  />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          <div className="p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col gap-6 group hover:border-[var(--primary)]/30 transition-all">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                 <AlertTriangle size={18} className="text-[var(--warning)] opacity-40 group-hover:opacity-100 transition-opacity" />
                                 <span className="text-[14px] font-black uppercase tracking-tight">{t('settings.allow_borrowing', 'Borrowing')}</span>
                              </div>
                              <input 
                                type="checkbox" 
                                className="toggle-checkbox" 
                                checked={formData.allowLeaveBorrowing}
                                onChange={e => setFormData({...formData, allowLeaveBorrowing: e.target.checked})}
                              />
                            </div>
                            <AnimatePresence>
                              {formData.allowLeaveBorrowing && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }} 
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="pt-6 border-t border-[var(--border-subtle)] space-y-4"
                                >
                                  <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60 ml-1">Limit (Days)</label>
                                  <input 
                                    type="number" 
                                    className="bg-transparent border-b-2 border-[var(--primary)] focus:border-[var(--primary)] outline-none text-2xl font-black w-full py-2"
                                    value={formData.borrowingLimit}
                                    onChange={e => setFormData({...formData, borrowingLimit: parseInt(e.target.value) || 0})}
                                  />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {activeTab === 'localization' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <section className="space-y-8">
                      <h4 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-60">{t('settings.global_language_system', 'Global Language System')}</h4>
                      <div className="grid grid-cols-1 gap-4">
                        {[
                          { id: 'en', label: 'English (US)', sub: 'Primary International Standard' },
                          { id: 'fr', label: 'Français (Guinée)', sub: 'Bilingual Regional standard' }
                        ].map((lang) => (
                          <button
                            key={lang.id}
                            onClick={() => setFormData({...formData, defaultLanguage: lang.id})}
                            className={cn(
                              "p-6 rounded-2xl border-2 text-left transition-all relative group",
                              formData.defaultLanguage === lang.id 
                                ? "border-[var(--primary)] bg-[var(--primary)]/5" 
                                : "border-transparent bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)]"
                            )}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <Languages size={24} className={cn("opacity-40", formData.defaultLanguage === lang.id ? "text-[var(--primary)]" : "")} />
                              {formData.defaultLanguage === lang.id && <Check size={16} className="text-[var(--primary)]" />}
                            </div>
                            <p className="font-bold text-[var(--text-primary)]">{lang.label}</p>
                            <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest mt-1 opacity-60">{lang.sub}</p>
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="space-y-8">
                      <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">{t('settings.currency_region', 'Currency & Region')}</h4>
                      <div className="space-y-8 p-10 rounded-[2.5rem] bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)]">
                        <div>
                          <label className="block text-[10px] font-black text-[var(--text-muted)] mb-4 uppercase tracking-[0.15em] ml-1">{t('settings.labels.system_currency', 'System Currency')}</label>
                          <select 
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl px-5 py-4 text-[14px] font-bold focus:border-[var(--primary)] outline-none shadow-sm appearance-none cursor-pointer"
                            value={formData.currency}
                            onChange={e => setFormData({...formData, currency: e.target.value})}
                          >
                            <option value="GNF">GNF (FG) - Guinean Franc</option>
                            <option value="USD">USD ($) - US Dollar</option>
                            <option value="EUR">EUR (€) - Euro</option>
                            <option value="GBP">GBP (£) - British Pound</option>
                            <option value="GHS">GHS (₵) - Ghanaian Cedi</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-[var(--text-muted)] mb-4 uppercase tracking-[0.15em] ml-1">{t('settings.labels.default_vat_rate', 'Default VAT Rate (%)')}</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl px-5 py-4 text-[14px] font-bold focus:border-[var(--primary)] outline-none shadow-sm"
                              value={formData.vatRate}
                              onChange={e => setFormData({...formData, vatRate: parseFloat(e.target.value)})}
                            />
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-[var(--text-muted)] opacity-40">%</span>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <section className="p-10 rounded-[3rem] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                        <Shield size={120} />
                      </div>
                      <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center text-[var(--primary)]">
                          <ShieldCheck size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-[var(--text-primary)]">{t('settings.governance', 'Governance')}</h4>
                          <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-60">{t('settings.policy_controls', 'Policy Controls')}</p>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] group">
                          <div>
                            <p className="text-[13px] font-bold text-[var(--text-primary)]">{t('settings.password_complexity', 'Password Complexity')}</p>
                            <p className="text-[10px] text-[var(--text-muted)] font-medium mt-1">{t('settings.password_complexity_desc', 'Enforce symbols and numbers.')}</p>
                          </div>
                          <input type="checkbox" defaultChecked className="toggle-checkbox" />
                        </div>
                        <div className="flex items-center justify-between p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                          <div>
                            <p className="text-[13px] font-bold text-[var(--text-primary)]">{t('settings.mfa_requirement', 'MFA Requirement')}</p>
                            <p className="text-[10px] text-[var(--text-muted)] font-medium mt-1">{t('settings.mfa_requirement_desc', 'Mandatory for all admin roles.')}</p>
                          </div>
                          <input type="checkbox" className="toggle-checkbox" />
                        </div>
                      </div>
                    </section>

                    <section className="p-10 rounded-[3rem] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                         <Sparkles size={120} />
                      </div>
                      <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500">
                          <Sparkles size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-[var(--text-primary)]">{t('settings.ai_assistant', 'AI Assistant')}</h4>
                          <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-60">{t('settings.nexus_ai_engine', 'MCB AI Engine')}</p>
                        </div>
                      </div>
                    </section>

                    <section className="p-10 rounded-[3rem] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 shadow-sm relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                        <Lock size={120} />
                      </div>
                      <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                          <Lock size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-[var(--text-primary)]">{t('settings.sessions', 'Sessions')}</h4>
                          <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-60">{t('settings.identity_management', 'Identity Management')}</p>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em] ml-1">{t('settings.auto_termination', 'Auto-Termination (Minutes)')}</label>
                        <select className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl px-5 py-4 text-[14px] font-bold focus:border-[var(--primary)] outline-none shadow-sm appearance-none cursor-pointer">
                          <option>15 Minutes</option>
                          <option>30 Minutes</option>
                          <option defaultValue={60}>60 Minutes (Default)</option>
                          <option>240 Minutes</option>
                        </select>
                        <p className="text-[10px] text-[var(--text-muted)] font-medium px-2 leading-relaxed opacity-60">{t('settings.auto_termination_desc', 'Users will be automatically logged out after inactivity for security.')}</p>
                      </div>
                    </section>
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {[
                      { icon: Mail, title: 'Email Notifications', desc: 'Communication preferences.', items: ['Leave Approvals', 'Payroll Updates', 'New Hire Welcome'] },
                      { icon: Smartphone, title: 'System Alerts', desc: 'Real-time application alerts.', items: ['Task Deadlines', 'Company Announcements', 'Performance Reviews'] }
                    ].map((sec, idx) => (
                      <div key={idx} className="p-10 rounded-[3rem] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50">
                        <div className="flex items-center gap-4 mb-10">
                          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", idx === 0 ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "bg-[var(--accent)]/10 text-[var(--accent)]")}>
                            <sec.icon size={22} />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg text-[var(--text-primary)]">{t(`settings.${sec.title?.toLowerCase()?.replace(' ', '_')}`, sec.title)}</h4>
                            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-60">{t(`settings.${sec.desc?.toLowerCase()?.replace(/[\s\.]/g, '_')}`, sec.desc)}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          {sec.items.map(item => (
                            <div key={item} className="flex items-center justify-between py-4 border-b border-[var(--border-subtle)]/50 last:border-0">
                              <span className="text-[13px] font-semibold text-[var(--text-secondary)]">{item}</span>
                              <input type="checkbox" defaultChecked className="toggle-checkbox" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'billing' && (
                  <div className="space-y-10">
                    <div className="p-12 rounded-[2rem] bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white overflow-hidden relative shadow-xl shadow-[var(--primary)]/20 group">
                      <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                           <div className="px-5 py-1.5 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Enterprise Premium</div>
                           <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_#4ade80]" />
                        </div>
                        <h4 className="text-6xl font-black tracking-tight mb-10">Enterprise</h4>
                        <div className="flex flex-wrap gap-8">
                           <div className="p-5 rounded-2xl bg-white/5 border border-white/10 min-w-[160px]">
                             <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">{t('settings.billing_cycle_end', 'Billing Cycle End')}</p>
                             <p className="text-lg font-bold">Dec 2026</p>
                           </div>
                           <div className="p-5 rounded-2xl bg-white/5 border border-white/10 min-w-[160px]">
                             <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">{t('settings.usage_limit', 'Usage Limit')}</p>
                             <p className="text-lg font-bold">412 / 1000 {t('common.users', 'Users')}</p>
                           </div>
                        </div>
                      </div>
                      <Building2 className="absolute -bottom-20 -right-20 text-white opacity-[0.05] transition-transform group-hover:scale-110 duration-1000" size={400} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <button className="p-8 rounded-[2.5rem] border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-main)] hover:border-[var(--primary)]/30 transition-all text-left shadow-sm group">
                        <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center text-[var(--primary)] mb-6 transition-transform group-hover:scale-110">
                          <CreditCard size={20} />
                        </div>
                        <p className="font-bold text-[var(--text-primary)]">{t('settings.payment_instrument', 'Payment Instrument')}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-2 uppercase font-black tracking-tighter opacity-50">Visa **** 4492</p>
                      </button>
                      {/* More billing buttons with same style */}
                    </div>
                  </div>
                )}

                {activeTab === 'data' && (
                  <div className="space-y-10">
                    <section className="p-12 rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:opacity-5 transition-opacity">
                         <HardDrive size={200} />
                      </div>
                      <div className="flex items-center gap-5 mb-12">
                         <div className="w-14 h-14 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center text-[var(--primary)]">
                            <HardDrive size={28} />
                         </div>
                         <div>
                           <h4 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{t('settings.data_management', 'Data Management')}</h4>
                           <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">{t('settings.export_backups', 'Export & Backups')}</p>
                         </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <button className="flex items-center justify-between p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)] hover:shadow-lg hover:shadow-[var(--primary)]/5 transition-all group">
                           <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-[var(--bg-main)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors">
                               <RefreshCw size={18} />
                             </div>
                             <span className="text-[13px] font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">Employee Core Set</span>
                           </div>
                           <Download size={18} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-all group-hover:translate-y-0.5" />
                        </button>
                        <button className="flex items-center justify-between p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)] hover:shadow-lg hover:shadow-[var(--primary)]/5 transition-all group">
                           <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-[var(--bg-main)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors">
                               <CreditCard size={18} />
                             </div>
                             <span className="text-[13px] font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">Fiscal History</span>
                           </div>
                           <Download size={18} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-all group-hover:translate-y-0.5" />
                        </button>
                      </div>
                    </section>

                    {/* Secure Data Vault — MD Exclusive */}
                    {((currentUser?.rank ?? 0) >= 85 || currentUser?.role === 'DEV') && (
                      <section className="p-12 rounded-[2rem] border border-[var(--primary)]/20 bg-[var(--primary)]/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-10 transition-all duration-700">
                           <Database size={200} className="rotate-12" />
                        </div>
                        
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative z-10">
                           <div className="flex items-center gap-5">
                              <div className="w-14 h-14 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center text-[var(--primary)] shadow-lg shadow-[var(--primary)]/5">
                                 <ShieldCheck size={28} />
                              </div>
                              <div>
                                <h4 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Secure Data Vault</h4>
                                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">Full Database Snapshots</p>
                              </div>
                           </div>
                           <button 
                             onClick={handleManualBackup}
                             disabled={triggeringBackup}
                             className="px-6 py-3 rounded-xl bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[var(--primary)]/20 flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                           >
                             {triggeringBackup ? <RefreshCw size={14} className="animate-spin" /> : <Database size={14} />}
                             Seal New Snapshot
                           </button>
                        </div>

                        <div className="space-y-3 relative z-10">
                           {fetchingBackups ? (
                              <div className="p-10 flex flex-col items-center justify-center gap-4 text-[var(--text-muted)]">
                                 <RefreshCw size={24} className="animate-spin opacity-20" />
                                 <p className="text-[10px] font-black uppercase tracking-widest">Scanning Vault...</p>
                              </div>
                           ) : backups.length > 0 ? (
                              <div className="grid grid-cols-1 gap-2">
                                 {backups.map((b: any) => (
                                    <div key={b.filename} className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-card)]/80 border border-[var(--border-subtle)] group/item hover:bg-[var(--bg-main)] transition-all">
                                       <div className="flex items-center gap-4">
                                          <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)] group-hover/item:text-[var(--primary)] transition-colors">
                                             <CheckCircle size={18} />
                                          </div>
                                          <div>
                                             <p className="text-[13px] font-bold text-[var(--text-secondary)]">{b.filename}</p>
                                             <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest leading-none mt-1">
                                                {new Date(b.createdAt).toLocaleDateString()} • {b.sizeKB} KB
                                             </p>
                                          </div>
                                       </div>
                                       <button 
                                         onClick={() => handleDownload(b.filename)}
                                         className="p-3 rounded-xl hover:bg-[var(--primary)]/10 text-[var(--text-muted)] hover:text-[var(--primary)] transition-all"
                                       >
                                          <Download size={18} />
                                       </button>
                                    </div>
                                 ))}
                              </div>
                           ) : (
                              <div className="p-12 text-center border-2 border-dashed border-[var(--border-subtle)] rounded-[2.5rem] opacity-40">
                                 <Database size={32} className="mx-auto mb-4" />
                                 <p className="text-[10px] font-black uppercase tracking-widest">No primary snapshots detected</p>
                              </div>
                           )}
                        </div>
                      </section>
                    )}

                    {/* Production Readiness — Data Purge */}
                    <section className="p-12 rounded-[2rem] border-2 border-rose-500/20 bg-rose-500/5 relative overflow-hidden">
                      <div className="flex items-center gap-5 mb-6">
                         <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 border border-rose-500/20">
                            <AlertTriangle size={28} />
                         </div>
                         <div>
                           <h4 className="text-xl font-bold text-rose-700 dark:text-rose-400 tracking-tight">{t('settings.data_purge_title', 'Production Data Reset')}</h4>
                           <p className="text-[11px] font-bold text-rose-500/70 uppercase tracking-[0.2em] mt-1">{t('settings.danger_zone', 'Danger Zone — Irreversible Action')}</p>
                         </div>
                      </div>
                      <p className="text-[13px] text-rose-700/70 dark:text-rose-400/70 mb-8 leading-relaxed font-medium max-w-2xl">
                        {t('settings.data_purge_desc', 'Permanently wipe all transactional and staff data — targets, appraisals, leave requests, payroll, and non-admin employees. Your MD and DEV accounts will be strictly preserved for continued access.')}
                        <strong className="text-rose-600"> {t('settings.data_purge_warning', 'Use this once before going live.')}</strong>
                      </p>
                      <button
                        onClick={async () => {
                          const pin = window.prompt('ENTER SECURITY PIN (4-Digits) TO AUTHORIZE RESET:');
                          if (pin !== '5646') {
                            if (pin !== null) toast.error('Unauthorized — Incorrect PIN.');
                            return;
                          }

                          const input = window.prompt('FINAL WARNING: Type "CONFIRM" to permanently wipe all transactional and staff data (Admin accounts spared). This action is IRREVERSIBLE.');
                          if (input !== 'CONFIRM') {
                            if (input !== null) toast.error('Purge cancelled — confirmation text did not match.');
                            return;
                          }
                          
                          setLoading(true);
                          try {
                            await api.post('/settings/purge-data', { pin });
                            toast.success('✅ All demo/transactional data purged. System is ready for production.');
                          } catch (err: any) {
                            toast.error(err.response?.data?.error || 'Purge failed. Please try again.');
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading}
                        className="px-8 py-4 rounded-2xl bg-rose-600 text-white font-black text-[11px] uppercase tracking-widest shadow-xl shadow-rose-600/20 hover:bg-rose-700 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                      >
                        <AlertTriangle size={16} />
                        {t('settings.purge_button', 'Purge All Demo Data')}
                      </button>
                    </section>
                  </div>
                )}

                {activeTab === 'payroll' && (
                  <div className="space-y-12 max-w-4xl">
                    <section className="p-10 rounded-[2.5rem] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] relative overflow-hidden">
                      <div className="absolute -top-10 -right-10 w-40 h-40 bg-[var(--primary)]/5 blur-3xl rounded-full" />
                      
                      <h4 className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] mb-10 flex items-center gap-3 relative z-10">
                        <CreditCard size={16} className="text-[var(--primary)]" /> {t('payroll.tax_social_security', 'Tax & Social Security')}
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
                        <div className="p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-6 shadow-sm hover:border-[var(--primary)]/20 transition-all">
                           <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60">{t('payroll.ssnit_employee', 'Employee SSNIT Rate (%)')}</label>
                           <div className="flex items-end gap-3">
                             <input 
                               type="number" step="0.001"
                               className="bg-transparent border-b-2 border-[var(--primary)]/30 focus:border-[var(--primary)] outline-none text-4xl font-black w-full py-2 transition-all"
                               value={Number(((formData.ssnitRate || 0) * 100).toFixed(3))}
                               onChange={e => setFormData({...formData, ssnitRate: (parseFloat(e.target.value) || 0) / 100})}
                             />
                             <span className="text-2xl font-black text-[var(--primary)] mb-2">%</span>
                           </div>
                           <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest opacity-40">Standard: 5.50%</p>
                        </div>

                        <div className="p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-6 shadow-sm hover:border-[var(--primary)]/20 transition-all">
                           <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60">{t('payroll.ssnit_employer', 'Employer SSNIT Rate (%)')}</label>
                           <div className="flex items-end gap-3">
                             <input 
                               type="number" step="0.001"
                               className="bg-transparent border-b-2 border-[var(--primary)]/30 focus:border-[var(--primary)] outline-none text-4xl font-black w-full py-2 transition-all"
                               value={Number(((formData.employerSsnitRate || 0) * 100).toFixed(3))}
                               onChange={e => setFormData({...formData, employerSsnitRate: (parseFloat(e.target.value) || 0) / 100})}
                             />
                             <span className="text-2xl font-black text-[var(--primary)] mb-2">%</span>
                           </div>
                           <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest opacity-40">Standard: 13.00%</p>
                        </div>
                      </div>
                    </section>

                    <section className="p-10 rounded-[2.5rem] bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-12">
                        <div>
                          <h4 className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-3">
                            <ShieldCheck size={16} className="text-[var(--primary)]" /> {t('payroll.paye_bands', 'Ghana PAYE Tax Bands')}
                          </h4>
                          <p className="text-[10px] text-[var(--text-muted)] font-bold mt-2 uppercase tracking-widest opacity-60">Monthly progressive taxation architecture</p>
                        </div>
                        <button 
                          onClick={() => {
                            const standardBands = [
                              { limit: 490,      rate: 0.00  },
                              { limit: 110,      rate: 0.05  },
                              { limit: 130,      rate: 0.10  },
                              { limit: 3166.67,  rate: 0.175 },
                              { limit: 16000,    rate: 0.25  },
                              { limit: 30520,    rate: 0.30  },
                              { limit: 999999999, rate: 0.35  },
                            ];
                            setFormData({...formData, payeBands: standardBands});
                          }}
                          className="text-[10px] font-black px-6 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all uppercase tracking-widest shadow-sm"
                        >
                          {t('payroll.reset_bands', 'Reset to 2024 Standards')}
                        </button>
                      </div>

                      <div className="space-y-3">
                         <div className="grid grid-cols-7 gap-4 px-6 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-40 mb-4">
                            <span className="col-span-3">Cumulative Limit (GHS)</span>
                            <span className="col-span-3">Marginal Rate (%)</span>
                            <span className="text-center">Action</span>
                         </div>
                         {Array.isArray(formData.payeBands) && (formData.payeBands as any[]).map((band, idx) => (
                           <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            key={idx} 
                            className="grid grid-cols-7 gap-4 items-center bg-[var(--bg-card)] p-5 rounded-[1.5rem] border border-[var(--border-subtle)] group hover:border-[var(--primary)]/30 transition-all shadow-sm"
                           >
                              <div className="col-span-3 relative">
                                <input 
                                  type="number" 
                                  className="w-full bg-transparent border-b-2 border-transparent focus:border-[var(--primary)] outline-none text-sm font-black py-1 transition-all"
                                  value={band.limit}
                                  onChange={e => {
                                    const newBands = [...(formData.payeBands as any[])];
                                    newBands[idx].limit = parseFloat(e.target.value) || 0;
                                    setFormData({...formData, payeBands: newBands});
                                  }}
                                />
                                {band.limit >= 999999 ? (
                                  <span className="absolute right-0 top-1 text-[10px] font-black text-[var(--primary)] opacity-40 uppercase tracking-tighter">MAX</span>
                                ) : null}
                              </div>
                              <div className="col-span-3 flex items-center gap-3">
                                <input 
                                  type="number" step="0.01"
                                  className="w-full bg-transparent border-b-2 border-transparent focus:border-[var(--primary)] outline-none text-sm font-black py-1 transition-all text-right"
                                  value={Number((band.rate * 100).toFixed(2))}
                                  onChange={e => {
                                    const newBands = [...(formData.payeBands as any[])];
                                    newBands[idx].rate = (parseFloat(e.target.value) || 0) / 100;
                                    setFormData({...formData, payeBands: newBands});
                                  }}
                                />
                                <span className="text-[11px] font-black opacity-20">%</span>
                              </div>
                              <div className="flex justify-center">
                                <button 
                                  onClick={() => {
                                    const newBands = (formData.payeBands as any[]).filter((_, i) => i !== idx);
                                    setFormData({...formData, payeBands: newBands});
                                  }}
                                  className="w-8 h-8 flex items-center justify-center text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                >
                                  <AlertTriangle size={14} />
                                </button>
                              </div>
                           </motion.div>
                         ))}
                         <button 
                           onClick={() => setFormData({...formData, payeBands: [...(formData.payeBands as any[] || []), { limit: 0, rate: 0 }]})}
                           className="w-full py-5 border-2 border-dashed border-[var(--border-subtle)] rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all mt-6 flex items-center justify-center gap-3"
                         >
                           <Plus size={14} />
                           {t('payroll.add_tax_band', 'Add Custom Tax Band')}
                         </button>
                      </div>
                    </section>
                  </div>
                )}

                {activeTab === 'infrastructure' && (
                  <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* Header */}
                    <div className="flex items-center gap-6 mb-12">
                      <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-[2rem] flex items-center justify-center text-[var(--primary)]">
                        <Server size={32} />
                      </div>
                      <div>
                        <h3 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter">Hardware Infrastructure</h3>
                        <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.25em] mt-2 italic">Institutional Node Management & Access Control</p>
                      </div>
                    </div>

                    {/* Attendance Scanning Section */}
                    <section className="p-10 rounded-[2.5rem] border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary)]/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                      
                      <div className="flex items-center justify-between mb-12">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                            <Smartphone size={20} />
                          </div>
                          <h4 className="text-lg font-black text-[var(--text-primary)]">QR/NFC Attendance Scanning</h4>
                        </div>
                        <div className="flex items-center gap-3">
                           <span className={cn("text-[10px] font-black uppercase tracking-widest", formData.attendanceScanningEnabled ? "text-emerald-500" : "text-[var(--text-muted)]")}>
                             {formData.attendanceScanningEnabled ? 'Active' : 'Disabled'}
                           </span>
                           <input 
                             type="checkbox" 
                             className="toggle-checkbox" 
                             checked={formData.attendanceScanningEnabled}
                             onChange={e => setFormData({...formData, attendanceScanningEnabled: e.target.checked})}
                           />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="space-y-6">
                           <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed font-medium">
                             Enable automated attendance logging by connecting external hardware nodes (Scanners, NFC Readers, or Tablet Kiosks). This integration automatically tracks check-in/out events and calculates billable hours.
                           </p>

                           <div className="p-6 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)] space-y-4">
                              <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Hardware Node API Key</label>
                              <div className="flex items-center gap-3">
                                 <input 
                                   type="password" 
                                   readOnly 
                                   value={formData.attendanceApiKey || '••••••••••••••••'} 
                                   className="flex-1 bg-transparent border-none font-mono text-sm outline-none" 
                                 />
                                 <button 
                                   onClick={() => {
                                      const key = 'MCB_' + Math.random().toString(36).substring(2, 15).toUpperCase();
                                      setFormData({...formData, attendanceApiKey: key});
                                      toast.success('New Hardware Key Generated');
                                   }}
                                   className="p-2 hover:bg-[var(--primary)]/10 rounded-lg text-[var(--primary)] transition-all"
                                 >
                                    <RefreshCw size={16} />
                                 </button>
                              </div>
                           </div>
                        </div>

                        {/* Guidance Section */}
                        <div className="p-8 rounded-3xl bg-slate-900 text-white space-y-6 shadow-2xl relative border border-white/5">
                           <div className="flex items-center gap-3 text-emerald-400">
                             <ShieldCheck size={20} />
                             <span className="text-[11px] font-black uppercase tracking-[0.2em]">Hardware Guidance</span>
                           </div>
                           <div className="space-y-4">
                              <div className="flex gap-4">
                                 <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                                 <p className="text-[12px] font-medium opacity-80">Mount your QR/NFC device at the company entrance.</p>
                              </div>
                              <div className="flex gap-4">
                                 <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                                 <p className="text-[12px] font-medium opacity-80">Configure the device to send a POST request to our Node Endpoint.</p>
                              </div>
                              <div className="flex gap-4">
                                 <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
                                 <p className="text-[12px] font-medium opacity-80">Include the <code className="bg-white/10 px-1.5 py-0.5 rounded text-emerald-300">Authorization</code> header with your Hardware Key.</p>
                              </div>
                           </div>
                           <div className="pt-4 border-t border-white/10">
                              <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-3 italic">API Endpoint</p>
                              <code className="text-[11px] text-emerald-400 bg-black/40 p-3 rounded-xl block break-all font-mono">
                                 {window.location.origin}/api/attendance/node-scan
                              </code>
                           </div>
                        </div>
                      </div>
                    </section>

                    {/* Infrastructure Status */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       {[
                         { label: 'Network Latency', value: '42ms', icon: Zap, color: 'text-emerald-500' },
                         { label: 'Active Nodes', value: '0 Nodes', icon: Server, color: 'text-[var(--text-muted)]' },
                         { label: 'Security Firewall', value: 'Fortress V4', icon: ShieldCheck, color: 'text-[var(--primary)]' },
                       ].map((stat, i) => (
                         <div key={i} className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center gap-5">
                            <div className={cn("w-12 h-12 rounded-2xl bg-current opacity-10 flex items-center justify-center", stat.color)}>
                               <stat.icon size={24} />
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{stat.label}</p>
                               <p className="text-xl font-black text-[var(--text-primary)] tracking-tight mt-1">{stat.value}</p>
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                {activeTab === 'integrations' && (
                   <ApiIntegrations />
                )}

              </div>

              {/* Bottom Form Bar */}
              <div className="mt-20 pt-10 border-t border-[var(--border-subtle)] flex items-center justify-between">
                <div className="hidden md:block">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-40 italic">System V5.2.5-IDENTITY-STABILITY Deployment Active</p>
                </div>
                <button
                  onClick={async () => {
                    setLoading(true);
                    try {
                      // Force a global refresh and broadcast
                      await handleSave();
                      toast.success('Global Identity Pulse Sent: All dashboards will sync shortly.');
                    } catch (e) { toast.error('Sync failed'); }
                    finally { setLoading(false); }
                  }}
                  className="px-8 py-5 rounded-2xl bg-indigo-600/10 text-indigo-600 font-black text-xs uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-3"
                >
                  <Zap size={18} />
                  <span>Sync to All Devices</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-10 py-5 rounded-2xl bg-[var(--primary)] text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-[var(--primary)]/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 disabled:scale-100"
                >
                  {loading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                  <span>{t('common.save_changes')}</span>
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <HardwareGuide 
        isOpen={showHardwareGuide} 
        onClose={() => setShowHardwareGuide(false)} 
        apiKey={settings.attendanceApiKey || ''} 
      />
    </div>
  );
};

export default SettingsHub;
