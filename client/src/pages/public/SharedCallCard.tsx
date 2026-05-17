import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Phone, Mail, Globe, Linkedin, Github, Award, 
  UserCheck, ShieldAlert, Download, MessageSquare, Briefcase, Building2
} from 'lucide-react';
import api from '../../services/api';
import { motion } from 'framer-motion';

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

const SharedCallCard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [card, setCard] = useState<CallCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bilateral Lead capture visitor state fields
  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorCompany, setVisitorCompany] = useState('');
  const [visitorNotes, setVisitorNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
      // Auto dismiss success banner after a few seconds
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
        // Direct unauthenticated public route scan
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

    // Direct JS generation of standard vCard stream
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

  // Define Theme Visual Properties
  let themeStyles = {
    bg: "bg-gradient-to-br from-[#0c1c15] via-[#050b07] to-[#040605]",
    cardBg: "bg-[#11241a]/60 backdrop-blur-2xl border-[#dfb76c]/30",
    accentText: "text-[#dfb76c]",
    badgeBg: "bg-[#dfb76c]/10 border-[#dfb76c]/20 text-[#dfb76c]",
    primaryBtn: "bg-gradient-to-r from-[#dfb76c] to-[#b69248] text-[#050b07] hover:shadow-[#dfb76c]/20",
    iconBg: "bg-[#dfb76c]/5 border-[#dfb76c]/10 text-[#dfb76c] hover:bg-[#dfb76c]/20",
    glowColor: "rgba(223, 183, 108, 0.15)",
    textColor: "text-[#e2e8f0]",
    titleColor: "text-white"
  };

  if (card.theme === 'MIDNIGHT_LUXURY') {
    themeStyles = {
      bg: "bg-gradient-to-br from-[#0d0f12] via-[#08090a] to-[#040405]",
      cardBg: "bg-[#171a21]/50 backdrop-blur-2xl border-white/10",
      accentText: "text-blue-400",
      badgeBg: "bg-blue-400/10 border-blue-400/20 text-blue-400",
      primaryBtn: "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white hover:shadow-blue-500/25",
      iconBg: "bg-white/5 border-white/10 text-white hover:bg-white/20",
      glowColor: "rgba(59, 130, 246, 0.12)",
      textColor: "text-gray-300",
      titleColor: "text-white"
    };
  } else if (card.theme === 'GHANA_SUNSHINE') {
    themeStyles = {
      bg: "bg-gradient-to-br from-[#1c0808] via-[#0c0505] to-[#050202]",
      cardBg: "bg-[#251010]/60 backdrop-blur-2xl border-red-500/30",
      accentText: "text-[#f97316]",
      badgeBg: "bg-[#f97316]/10 border-[#f97316]/20 text-[#f97316]",
      primaryBtn: "bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 text-white hover:shadow-orange-500/25",
      iconBg: "bg-[#f97316]/5 border-[#f97316]/10 text-[#f97316] hover:bg-[#f97316]/20",
      glowColor: "rgba(249, 115, 22, 0.15)",
      textColor: "text-[#fed7aa]",
      titleColor: "text-white"
    };
  }

  // Quick fallback initials
  const initials = card.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className={`min-h-screen ${themeStyles.bg} flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden transition-all duration-700`}>
      {/* Decorative Radial Ambient Glows */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full blur-[100px] pointer-events-none transition-all duration-700" 
        style={{ background: themeStyles.glowColor }} 
      />

      <motion.div 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="max-w-md w-full relative z-10"
      >
        {/* PREMIUM VISUAL BUSINESS CARD FRAME */}
        <div className={`nx-card ${themeStyles.cardBg} border p-8 rounded-[32px] shadow-2xl relative overflow-hidden space-y-8`}>
          
          {/* Header Row: Company Logo & Identity Badges */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className={`px-3 py-1 rounded-full border text-[7px] sm:text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ${themeStyles.badgeBg}`}>
                <UserCheck size={9} />
                Corporate Contact
              </span>
            </div>
            <div className="text-right">
              <h3 className="text-[12px] font-black uppercase tracking-[0.25em] text-white">MCB</h3>
              <p className="text-[6px] font-bold uppercase tracking-widest text-gray-500">Ghana</p>
            </div>
          </div>

          {/* Profile Card Info Block */}
          <div className="flex items-center gap-6">
            {/* Elegant Circular Avatar Profile */}
            <div className="relative">
              {card.employee.avatarUrl ? (
                <img 
                  src={card.employee.avatarUrl} 
                  alt={card.fullName} 
                  className={`w-20 h-20 rounded-2xl object-cover border-2 p-0.5 ${card.theme === 'MCB_GOLD' ? 'border-[#dfb76c]' : card.theme === 'GHANA_SUNSHINE' ? 'border-orange-500' : 'border-blue-400'}`}
                />
              ) : (
                <div className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center font-black text-xl tracking-tighter ${card.theme === 'MCB_GOLD' ? 'bg-[#dfb76c]/5 border-[#dfb76c]/40 text-[#dfb76c]' : card.theme === 'GHANA_SUNSHINE' ? 'bg-[#f97316]/5 border-[#f97316]/40 text-[#f97316]' : 'bg-white/5 border-white/20 text-white'}`}>
                  {initials}
                </div>
              )}
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              <h2 className={`text-xl sm:text-2xl font-black ${themeStyles.titleColor} tracking-tight leading-none uppercase truncate`}>
                {card.fullName}
              </h2>
              <div className="flex flex-col gap-0.5">
                <span className={`text-xs font-bold ${themeStyles.accentText} uppercase tracking-wider flex items-center gap-1.5`}>
                  <Briefcase size={12} className="opacity-70" />
                  {card.jobTitle}
                </span>
                {card.department && (
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide flex items-center gap-1.5">
                    <Building2 size={11} className="opacity-70" />
                    {card.department}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bio / Description */}
          {card.bio && (
            <p className={`text-xs leading-relaxed font-semibold italic ${themeStyles.textColor} opacity-80 border-l-2 pl-4 py-0.5 ${card.theme === 'MCB_GOLD' ? 'border-[#dfb76c]/30' : card.theme === 'GHANA_SUNSHINE' ? 'border-orange-500/30' : 'border-blue-500/30'}`}>
              "{card.bio}"
            </p>
          )}

          {/* Interactive Social Contact Icon Grid */}
          <div className="space-y-4 pt-4 border-t border-gray-800/40">
            <h4 className="text-[8px] font-black uppercase tracking-[0.25em] text-gray-500 mb-4">Direct Contact & Channels</h4>
            <div className="grid grid-cols-2 gap-3.5">
              {/* Primary Email */}
              <a 
                href={`mailto:${card.email}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${themeStyles.iconBg}`}
              >
                <Mail size={14} className="opacity-80" />
                <span className="truncate">Email Address</span>
              </a>

              {/* Primary Phone */}
              {card.phone && (
                <a 
                  href={`tel:${card.phone}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${themeStyles.iconBg}`}
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${themeStyles.iconBg}`}
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${themeStyles.iconBg}`}
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${themeStyles.iconBg}`}
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${themeStyles.iconBg}`}
                >
                  <Globe size={14} className="opacity-80" />
                  <span className="truncate">Portfolio</span>
                </a>
              )}
            </div>
          </div>

          {/* Action Row: Save Contact Action button */}
          <div className="pt-6">
            <button 
              onClick={handleSaveContact}
              className={`w-full py-4.5 rounded-[18px] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-lg transition-all duration-300 transform active:scale-[0.98] ${themeStyles.primaryBtn}`}
            >
              <Download size={14} />
              Save Contact to Phone
            </button>
          </div>
        </div>

        {/* Exchange Contact details capture form */}
        <div className={`mt-8 ${themeStyles.cardBg} border p-8 rounded-[32px] shadow-2xl relative overflow-hidden space-y-6`}>
          <div className="space-y-1">
            <span className={`px-3 py-1 rounded-full border text-[7px] sm:text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 w-max ${themeStyles.badgeBg}`}>
              <Award size={9} />
              Bilateral Lead Exchange
            </span>
            <h3 className="text-sm font-black uppercase tracking-wider text-white">Share Your Contact Info</h3>
            <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
              Send your professional contact details back to {card.fullName.split(' ')[0]} to establish a mutual connection.
            </p>
          </div>

          {success ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl text-center space-y-2"
            >
              <p className="text-xs font-black uppercase tracking-wider text-emerald-400">Connection Sent!</p>
              <p className="text-[10px] text-emerald-300/80 font-medium">
                Your details have been successfully synced to {card.fullName.split(' ')[0]}'s corporate dashboard log.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleConnectSubmit} className="space-y-4">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/20 p-3.5 rounded-xl text-center">
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">{formError}</p>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 font-bold">Your Full Name *</label>
                <input 
                  type="text" 
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="e.g. Kwame Mensah"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-white/30 transition-all font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 font-bold">Email Address *</label>
                  <input 
                    type="email" 
                    value={visitorEmail}
                    onChange={(e) => setVisitorEmail(e.target.value)}
                    placeholder="kwame@company.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-white/30 transition-all font-semibold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 font-bold">Phone Number</label>
                  <input 
                    type="tel" 
                    value={visitorPhone}
                    onChange={(e) => setVisitorPhone(e.target.value)}
                    placeholder="+233 24 000 0000"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-white/30 transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 font-bold">Company & Title</label>
                <input 
                  type="text" 
                  value={visitorCompany}
                  onChange={(e) => setVisitorCompany(e.target.value)}
                  placeholder="e.g. Enterprise GH, Director"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-white/30 transition-all font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 font-bold">Add a Short Note</label>
                <textarea 
                  value={visitorNotes}
                  onChange={(e) => setVisitorNotes(e.target.value)}
                  placeholder="Great meeting you today!"
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-white/30 transition-all font-semibold resize-none"
                />
              </div>

              <button 
                type="submit"
                disabled={submitting}
                className={`w-full py-3.5 rounded-[16px] text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-md transition-all duration-300 transform active:scale-[0.98] ${themeStyles.primaryBtn} ${submitting ? 'opacity-55 cursor-not-allowed' : ''}`}
              >
                {submitting ? 'Submitting...' : 'Send My Info Back'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[8px] font-bold uppercase tracking-widest text-gray-500 mt-8">
          Powered by MCB Ghana digital workspace systems
        </p>
      </motion.div>
    </div>
  );
};

export default SharedCallCard;
