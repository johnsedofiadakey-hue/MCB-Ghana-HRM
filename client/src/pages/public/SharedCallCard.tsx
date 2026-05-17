import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Phone, Mail, Globe, Linkedin, Github, Award, 
  UserCheck, ShieldAlert, Download, MessageSquare, Briefcase, Building2
} from 'lucide-react';
import api from '../../services/api';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../utils/cn';
import { QRCodeCanvas } from 'qrcode.react';
import { getSafeAvatarUrl } from '../../utils/avatar';

interface CallCardData {
  id: string;
  fullName: string;
  jobTitle: string;
  department: string | null;
  bio: string | null;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  linkedin: string | null;
  github: string | null;
  website: string | null;
  theme: string;
  logoUrl: string | null;
  isActive: boolean;
  employee: {
    avatarUrl: string | null;
  };
}

// Design Theme Configs matching ITAdmin and EmployeeProfile card themes exactly
const themeConfigs: Record<string, {
    cardBg: string;
    textPrimary: string;
    textMuted: string;
    border: string;
    tagBg: string;
    tagBorder: string;
    tagText: string;
    avatarBorder: string;
    logoColor: string;
    isDark: boolean;
}> = {
    MCB_LIGHT_GOLD: {
        cardBg: "bg-gradient-to-br from-[#FCFBF7] via-[#F8F5EC] to-[#EFEADA]",
        textPrimary: "text-[#3D321D]",
        textMuted: "text-[#8C7A5B]",
        border: "border-[#DFB76C]/30",
        tagBg: "bg-[#DFB76C]/10",
        tagBorder: "border-[#DFB76C]/30",
        tagText: "text-[#B08A42]",
        avatarBorder: "border-[#DFB76C]",
        logoColor: "#B08A42",
        isDark: false
    },
    MCB_LIGHT_NAVY: {
        cardBg: "bg-gradient-to-br from-[#F5F8FC] via-[#EEF2F9] to-[#E2EAF5]",
        textPrimary: "text-[#0F1E36]",
        textMuted: "text-[#627797]",
        border: "border-[#1E3A8A]/10",
        tagBg: "bg-[#1E3A8A]/5",
        tagBorder: "border-[#1E3A8A]/10",
        tagText: "text-[#1E3A8A]",
        avatarBorder: "border-[#1E3A8A]",
        logoColor: "#1E3A8A",
        isDark: false
    },
    GHANA_SUNSHINE_LIGHT: {
        cardBg: "bg-gradient-to-br from-[#FFFDF9] via-[#FFF8EC] to-[#FEF0D9]",
        textPrimary: "text-[#541B1B]",
        textMuted: "text-[#9E5F5F]",
        border: "border-[#EF4444]/15",
        tagBg: "bg-[#EF4444]/5",
        tagBorder: "border-[#EF4444]/10",
        tagText: "text-[#EF4444]",
        avatarBorder: "border-[#F59E0B]",
        logoColor: "#D97706",
        isDark: false
    },
    MIDNIGHT_LUXURY: {
        cardBg: "bg-gradient-to-br from-[#0B0D19] via-[#05060B] to-[#010103]",
        textPrimary: "text-[#F8FAFC]",
        textMuted: "text-[#64748B]",
        border: "border-[#38BDF8]/20",
        tagBg: "bg-[#38BDF8]/10",
        tagBorder: "border-[#38BDF8]/20",
        tagText: "text-[#38BDF8]",
        avatarBorder: "border-[#38BDF8]",
        logoColor: "#38BDF8",
        isDark: true
    },
    MCB_GOLD: {
        cardBg: "bg-gradient-to-br from-[#0C1C15] via-[#050B07] to-[#010201]",
        textPrimary: "text-[#F5EAD4]",
        textMuted: "text-[#A39274]",
        border: "border-[#DFB76C]/30",
        tagBg: "bg-[#DFB76C]/10",
        tagBorder: "border-[#DFB76C]/20",
        tagText: "text-[#DFB76C]",
        avatarBorder: "border-[#DFB76C]",
        logoColor: "#DFB76C",
        isDark: true
    },
    GHANA_SUNSHINE: {
        cardBg: "bg-gradient-to-br from-[#1C0808] via-[#0C0303] to-[#030101]",
        textPrimary: "text-[#FED7AA]",
        textMuted: "text-[#A8A29E]",
        border: "border-[#EF4444]/25",
        tagBg: "bg-[#EF4444]/10",
        tagBorder: "border-[#EF4444]/20",
        tagText: "text-[#F97316]",
        avatarBorder: "border-[#EF4444]",
        logoColor: "#EF4444",
        isDark: true
    }
};

const getThemeConfigs = (themeName: string, primaryColor: string, accentColor: string) => {
    const base = themeConfigs[themeName] || themeConfigs.MCB_LIGHT_GOLD;
    const styles: any = {
        textPrimary: {},
        tagBg: {},
        avatarBorder: {}
    };

    if (themeName === 'MCB_LIGHT_NAVY') {
        styles.textPrimary = { color: primaryColor };
        styles.tagBg = { backgroundColor: `${primaryColor}15`, borderColor: `${primaryColor}30`, color: primaryColor };
        styles.avatarBorder = { borderColor: primaryColor };
    }

    return {
        ...base,
        styles
    };
};

const SharedCallCard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [card, setCard] = useState<CallCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  // Bilateral Lead capture visitor state fields
  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorCompany, setVisitorCompany] = useState('');
  const [visitorNotes, setVisitorNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { settings } = useTheme();

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim() || !visitorEmail.trim()) {
      setFormError('Please fill in your Name and Email.');
      return;
    }
    try {
      setSubmitting(true);
      setFormError(null);
      await api.post(`/public/call-cards/${id}/connect`, {
        fullName: visitorName,
        email: visitorEmail,
        phone: visitorPhone,
        company: visitorCompany,
        notes: visitorNotes
      });
      setSuccess(true);
      setVisitorName('');
      setVisitorEmail('');
      setVisitorPhone('');
      setVisitorCompany('');
      setVisitorNotes('');
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      console.error('[SharedCard] Connect error:', err);
      setFormError(err.response?.data?.error || 'Failed to exchange contact details.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchCard = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/public/call-cards/${id}`);
        setCard(res.data);
      } catch (err: any) {
        console.error('[SharedCard] Error loading profile:', err);
        setError(err.response?.data?.error || 'Digital call card not found or suspended.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchCard();
  }, [id]);

  const handleSaveContact = () => {
    if (!card) return;

    const cleanNum = (num: string) => num.replace(/[^\d+]/g, '');
    const cleanWhatsapp = card.whatsapp ? cleanNum(card.whatsapp) : '';
    
    const vcardFields = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${card.fullName}`,
      `N:${card.fullName.split(' ').reverse().join(';')};;;`,
      `ORG:MCB Ghana${card.department ? ';' + card.department : ''}`,
      `TITLE:${card.jobTitle}`,
      card.phone ? `TEL;TYPE=CELL,VOICE:${card.phone}` : '',
      `EMAIL;TYPE=PREF,INTERNET:${card.email}`,
      cleanWhatsapp ? `URL;TYPE=WhatsApp:https://wa.me/${cleanWhatsapp}` : '',
      card.linkedin ? `URL;TYPE=LinkedIn:${card.linkedin}` : '',
      card.github ? `URL;TYPE=GitHub:${card.github}` : '',
      card.website ? `URL;TYPE=Website:${card.website}` : '',
      `NOTE:MCB Ghana - Digital Business Card for ${card.fullName}`,
      'REV:' + new Date().toISOString(),
      'END:VCARD'
    ].filter(Boolean).join('\r\n');

    const blob = new Blob([vcardFields], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${card.fullName.replace(/\s+/g, '_')}_contact.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e1117] flex flex-col items-center justify-center gap-6 p-4">
        <div className="w-14 h-14 rounded-full border-4 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] animate-pulse">
          Syncing Corporate Matrix
        </p>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-[#161a23]/60 backdrop-blur-xl border border-red-500/20 p-8 rounded-3xl text-center space-y-6 shadow-2xl"
        >
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto text-red-500 border border-red-500/20">
            <ShieldAlert size={28} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white tracking-tight uppercase">Access Revoked</h2>
            <p className="text-sm text-gray-400 font-medium">
              {error || 'The digital call card you scanned has been disabled or suspended by security operations.'}
            </p>
          </div>
          <div className="pt-4 border-t border-gray-800">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              MCB Ghana Security & Systems
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const primaryCol = settings?.primaryColor || '#009EE3';
  const accentCol = settings?.accentColor || '#EE7100';
  const logoSrc = settings?.logoUrl || settings?.companyLogoUrl || '';
  const themeStyles = getThemeConfigs(card.theme || 'MCB_LIGHT_GOLD', primaryCol, accentCol);

  // Dynamic style parameters
  const pageBg = themeStyles.isDark 
    ? "bg-gradient-to-br from-[#0c0f17] via-[#07090e] to-[#030406]" 
    : "bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0]";

  const pageText = themeStyles.isDark ? "text-gray-300" : "text-slate-700";
  const titleText = themeStyles.isDark ? "text-white" : "text-slate-800";
  
  // Custom button styling for Ghanaian dynamic corporate brand
  const primaryBtnStyle = card.theme === 'MCB_LIGHT_NAVY' ? {
      background: `linear-gradient(135deg, ${primaryCol}, ${accentCol})`,
      color: '#ffffff',
      boxShadow: `0 4px 14px ${primaryCol}30`
  } : undefined;

  const primaryBtnClass = card.theme === 'MCB_LIGHT_NAVY'
    ? "w-full py-4.5 rounded-[18px] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-lg transition-all duration-300 transform active:scale-[0.98] border border-transparent hover:scale-102"
    : `w-full py-4.5 rounded-[18px] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-lg transition-all duration-300 transform active:scale-[0.98] ${
        themeStyles.isDark 
          ? "bg-gradient-to-r from-[#dfb76c] to-[#b69248] text-[#050b07] hover:shadow-[#dfb76c]/20" 
          : "bg-slate-800 text-white hover:bg-slate-900"
      }`;

  const iconBgStyle = card.theme === 'MCB_LIGHT_NAVY' ? {
      color: primaryCol,
      borderColor: `${primaryCol}30`,
      backgroundColor: `${primaryCol}08`
  } : undefined;

  const iconBgClass = card.theme === 'MCB_LIGHT_NAVY'
    ? "flex items-center gap-3 px-4 py-3 rounded-2xl border text-[10px] font-bold uppercase tracking-wider transition-all duration-300 hover:scale-102"
    : themeStyles.isDark
      ? `flex items-center gap-3 px-4 py-3 rounded-2xl border text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${themeStyles.tagBg} ${themeStyles.tagBorder} ${themeStyles.tagText} hover:opacity-80`
      : `flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 hover:bg-slate-100 hover:text-slate-900`;

  const inputClass = themeStyles.isDark 
    ? "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-white/30 transition-all font-semibold" 
    : "w-full bg-slate-100/80 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-300 transition-all font-semibold";

  const labelClass = themeStyles.isDark
    ? "text-[8px] font-black uppercase tracking-widest text-gray-400 font-bold"
    : "text-[8px] font-black uppercase tracking-widest text-slate-500 font-bold";

  return (
    <div className={`min-h-screen ${pageBg} flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden transition-all duration-700`}>
      {/* Radial ambient glow */}
      {themeStyles.isDark && (
        <div 
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full blur-[100px] pointer-events-none transition-all duration-700" 
          style={{ background: 'rgba(223, 183, 108, 0.08)' }} 
        />
      )}

      <motion.div 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="max-w-md w-full relative z-10 space-y-6"
      >
        {/* Flippable Visual Card Frame */}
        <div className="relative w-full h-[230px] [perspective:1000px] cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
          <div className={cn(
              "w-full h-full relative transition-transform duration-700 [transform-style:preserve-3d]",
              isFlipped ? "[transform:rotateY(180deg)]" : ""
          )}>
              {/* FRONT SIDE */}
              <div className={cn(
                  "absolute inset-0 w-full h-full rounded-[24px] border p-6 shadow-xl [backface-visibility:hidden] flex flex-col justify-between transition-all duration-300",
                  themeStyles.cardBg,
                  themeStyles.border,
                  themeStyles.textPrimary
              )} style={themeStyles.styles?.textPrimary}>
                  <div className="flex justify-between items-start">
                      <div>
                          <span className={cn(
                              "px-2.5 py-1 rounded-full border text-[7px] font-black uppercase tracking-wider",
                              themeStyles.tagBg,
                              themeStyles.tagBorder,
                              themeStyles.tagText
                          )} style={themeStyles.styles?.tagBg}>
                              MCB Ghana Lead Card
                          </span>
                      </div>
                      <div className="text-right flex items-center gap-1.5">
                          {logoSrc ? (
                              <img src={logoSrc} alt="Company Logo" className="h-6 max-w-[70px] object-contain" />
                          ) : (
                              <>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="inline-block">
                                      <path d="M12 2L2 22h20L12 2z" fill={themeStyles.logoColor} />
                                  </svg>
                                  <div>
                                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">MCB</h4>
                                      <p className="text-[5px] font-black uppercase tracking-widest opacity-60 mt-0.5">Ghana</p>
                                  </div>
                              </>
                          )}
                      </div>
                  </div>

                  <div className="flex items-center gap-4 my-2">
                      <img 
                          src={getSafeAvatarUrl(card.employee?.avatarUrl, card.fullName)} 
                          alt={card.fullName} 
                          className="w-12 h-12 rounded-xl object-cover border-2 p-0.5 shadow-md"
                          style={themeStyles.styles?.avatarBorder}
                      />
                      <div className="min-w-0">
                          <h3 className="text-sm font-black uppercase tracking-tight truncate">{card.fullName}</h3>
                          <p className="text-[9px] font-bold opacity-80 uppercase tracking-wide truncate">{card.jobTitle}</p>
                          {card.department && <p className="text-[7px] font-semibold opacity-60 uppercase tracking-widest truncate">{card.department}</p>}
                      </div>
                  </div>

                  <div className="border-t border-current/10 pt-3 text-[8px] font-bold space-y-1 opacity-80">
                      <p className="truncate">✉ {card.email}</p>
                      {card.phone && <p className="truncate">☎ {card.phone}</p>}
                  </div>
              </div>

              {/* BACK SIDE */}
              <div className={cn(
                  "absolute inset-0 w-full h-full rounded-[24px] border p-5 shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between transition-all duration-300",
                  themeStyles.cardBg,
                  themeStyles.border,
                  themeStyles.textPrimary
              )} style={themeStyles.styles?.textPrimary}>
                  <div className="flex justify-between items-center mb-1">
                      <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Scan to Connect</span>
                      {logoSrc ? (
                          <img src={logoSrc} alt="Company Logo" className="h-5 max-w-[60px] object-contain" />
                      ) : (
                          <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Back Side</span>
                      )}
                  </div>
                  <div className="flex-1 flex items-center justify-center py-2">
                      <div className="p-2 bg-white rounded-xl shadow-md border border-gray-150 inline-block">
                          <QRCodeCanvas 
                              id={`qr-canvas-public-${card.id}`}
                              value={`${window.location.origin}/shared-card/${card.id}`}
                              size={90}
                              level="H"
                              includeMargin={false}
                          />
                      </div>
                  </div>
                  <div className="text-center text-[7px] font-black uppercase tracking-widest opacity-60">
                      MCB Ghana Corporate Network
                  </div>
              </div>
          </div>
        </div>

        {/* Flip Assist Controls */}
        <div className="flex justify-center text-[9px] font-black uppercase tracking-widest text-slate-500">
            <button 
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(!isFlipped);
                }}
                className="hover:text-[var(--primary)] transition-all flex items-center gap-1.5"
            >
                🔄 Tap Card to Flip front / back
            </button>
        </div>

        {/* Primary Contact Download Panel */}
        <div className="space-y-4">
          <button 
            onClick={handleSaveContact}
            className={primaryBtnClass}
            style={primaryBtnStyle}
          >
            <Download size={14} />
            Save Contact to Phone
          </button>
        </div>

        {/* Contact Channels Panel */}
        <div className={cn(
          "p-6 rounded-[28px] border shadow-md space-y-4",
          themeStyles.isDark 
            ? "bg-[#111827]/50 border-gray-800" 
            : "bg-white/90 border-slate-200"
        )}>
          <h4 className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">Direct Channels</h4>
          <div className="grid grid-cols-2 gap-3">
            {/* Primary Email */}
            <a 
              href={`mailto:${card.email}`}
              className={iconBgClass}
              style={iconBgStyle}
            >
              <Mail size={14} className="opacity-80" />
              <span className="truncate">Email Address</span>
            </a>

            {/* Primary Phone */}
            {card.phone && (
              <a 
                href={`tel:${card.phone}`}
                className={iconBgClass}
                style={iconBgStyle}
              >
                <Phone size={14} className="opacity-80" />
                <span className="truncate">Voice Call</span>
              </a>
            )}

            {/* Direct WhatsApp Message */}
            {card.whatsapp && (
              <a 
                href={`https://wa.me/${card.whatsapp.replace(/[^\d+]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className={iconBgClass}
                style={iconBgStyle}
              >
                <MessageSquare size={14} className="opacity-80" />
                <span className="truncate">WhatsApp Chat</span>
              </a>
            )}

            {/* LinkedIn */}
            {card.linkedin && (
              <a 
                href={card.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className={iconBgClass}
                style={iconBgStyle}
              >
                <Linkedin size={14} className="opacity-80" />
                <span className="truncate">LinkedIn</span>
              </a>
            )}

            {/* GitHub */}
            {card.github && (
              <a 
                href={card.github}
                target="_blank"
                rel="noopener noreferrer"
                className={iconBgClass}
                style={iconBgStyle}
              >
                <Github size={14} className="opacity-80" />
                <span className="truncate">GitHub</span>
              </a>
            )}

            {/* Personal Portfolio Website */}
            {card.website && (
              <a 
                href={card.website}
                target="_blank"
                rel="noopener noreferrer"
                className={iconBgClass}
                style={iconBgStyle}
              >
                <Globe size={14} className="opacity-80" />
                <span className="truncate">Portfolio</span>
              </a>
            )}
          </div>
        </div>

        {/* Bilateral Lead capture portal */}
        <div className={cn(
          "p-8 rounded-[32px] shadow-lg border space-y-6",
          themeStyles.isDark 
            ? "bg-[#111827]/50 border-gray-800" 
            : "bg-white/95 border-slate-200"
        )}>
          <div className="space-y-1">
            <span className={cn(
              "px-3 py-1 rounded-full border text-[7px] sm:text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 w-max",
              themeStyles.tagBg,
              themeStyles.tagBorder,
              themeStyles.tagText
            )} style={themeStyles.styles?.tagBg}>
              <Award size={9} />
              Bilateral Lead Exchange
            </span>
            <h3 className={`text-sm font-black uppercase tracking-wider ${titleText}`}>Share Your Contact Info</h3>
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
              Send your professional contact details back to {card.fullName.split(' ')[0]} to establish a mutual connection.
            </p>
          </div>

          {success ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl text-center space-y-2"
            >
              <p className="text-xs font-black uppercase tracking-wider text-emerald-500">Connection Sent!</p>
              <p className="text-[10px] text-emerald-600/80 font-medium">
                Your details have been successfully synced to {card.fullName.split(' ')[0]}'s corporate dashboard log.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleConnectSubmit} className="space-y-4">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/20 p-3.5 rounded-xl text-center">
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">{formError}</p>
                </div>
              )}

              <div className="space-y-1">
                <label className={labelClass}>Your Full Name *</label>
                <input 
                  type="text" 
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="Kwame Mensah"
                  className={inputClass}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelClass}>Email Address *</label>
                  <input 
                    type="email" 
                    value={visitorEmail}
                    onChange={(e) => setVisitorEmail(e.target.value)}
                    placeholder="kwame@company.com"
                    className={inputClass}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Phone Number</label>
                  <input 
                    type="tel" 
                    value={visitorPhone}
                    onChange={(e) => setVisitorPhone(e.target.value)}
                    placeholder="+233 24 000 0000"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className={labelClass}>Company & Title</label>
                <input 
                  type="text" 
                  value={visitorCompany}
                  onChange={(e) => setVisitorCompany(e.target.value)}
                  placeholder="Enterprise GH, Director"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1">
                <label className={labelClass}>Add a Short Note</label>
                <textarea 
                  value={visitorNotes}
                  onChange={(e) => setVisitorNotes(e.target.value)}
                  placeholder="Great meeting you today!"
                  rows={2}
                  className={cn(inputClass, "resize-none")}
                />
              </div>

              <button 
                type="submit"
                disabled={submitting}
                className={primaryBtnClass}
                style={primaryBtnStyle}
              >
                {submitting ? 'Submitting...' : 'Send My Info Back'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-8">
          Powered by MCB Ghana digital workspace systems
        </p>
      </motion.div>
    </div>
  );
};

export default SharedCallCard;
