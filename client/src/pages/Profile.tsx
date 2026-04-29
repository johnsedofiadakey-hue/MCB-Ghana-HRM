import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Shield, Camera, Lock, CheckCircle2, AlertCircle, Loader2, Building2, Trash2, Fingerprint } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getStoredUser, getRankFromRole } from '../utils/session';
import api from '../services/api';
import { cn } from '../utils/cn';
import HistoryLog from '../components/profile/HistoryLog';
import { useTranslation } from 'react-i18next';
import { usePersistentDraft } from '../hooks/usePersistentDraft';
import { optimizeImage } from '../utils/image';
import SignaturePad from '../components/common/SignaturePad';


const Profile = () => {
    const user = getStoredUser();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        fullName: user?.name || '',
        email: user?.email || '',
        phone: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'security' | 'history'>('info');
    const [history, setHistory] = useState<any[]>([]);
    
    // 🛡️ AUTHORIZATION LOCKDOWN: MD, HR, or IT Only
    // 🛡️ AUTHORIZATION LOCKDOWN
    const privilegedRoles = ['MD', 'DIRECTOR', 'HR_OFFICER', 'IT_MANAGER', 'IT_ADMIN'];
    const rank = getRankFromRole(user?.role || 'EMPLOYEE');
    
    // canEditIdentity refers to the core fields (Name, Email). Everyone can edit their signature.
    const canEditIdentity = privilegedRoles.includes(user?.role || '') && rank >= 80;
    
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestMsg, setRequestMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { t } = useTranslation();

    // PERSISTENCE: Save contact info draft (skip passwords)
    const { data: draftData, updateDraft } = usePersistentDraft('profile_drafts', `profile_${user?.id || 'unknown'}`, {
        fullName: user?.name || '',
        email: user?.email || '',
        phone: ''
    });

    // Auto-save contact info when it changes
    useEffect(() => {
        const infoOnly = { fullName: formData.fullName, email: formData.email, phone: formData.phone };
        const timer = setTimeout(() => {
            updateDraft(infoOnly);
        }, 1000);
        return () => clearTimeout(timer);
    }, [formData.fullName, formData.email, formData.phone]);

    // Restore draft if it exists and is different from current
    useEffect(() => {
        if (draftData && draftData.fullName && !loading) {
            setFormData(prev => ({
                ...prev,
                fullName: draftData.fullName || prev.fullName,
                email: draftData.email || prev.email,
                phone: draftData.phone || prev.phone
            }));
        }
    }, [draftData?.fullName, draftData?.email, draftData?.phone]);


    useEffect(() => {
        const fetchProfile = async () => {
            if (!user.id) return;
            try {
                const res = await api.get(`/users/${user.id}`);
                setFormData(d => ({
                    ...d,
                    fullName: res.data.fullName,
                    email: res.data.email,
                    phone: res.data.contactNumber || ''
                }));
                setSignatureUrl(res.data.signatureUrl || null);
                setHistory(res.data.historyLogs || []);
            } catch (err) {
                console.error('Failed to fetch profile', err);
            }
        };
        fetchProfile();
    }, [user.id]);

    const handleUpdateInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await api.patch(`/users/${user.id}`, {
                fullName: formData.fullName,
                email: formData.email,
                contactNumber: formData.phone
            });
            setSuccess('Profile updated successfully.');
            // Update local storage if fields changed
            const stored = JSON.parse(localStorage.getItem('mcb_user') || '{}');
            stored.name = formData.fullName;
            stored.email = formData.email;
            stored.contactNumber = formData.phone;
            localStorage.setItem('mcb_user', JSON.stringify(stored));
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Failed to update profile.');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.newPassword !== formData.confirmPassword) {
            return setError('Passwords do not match.');
        }
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await api.post('/auth/change-password', {
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword
            });
            setSuccess('Password changed successfully.');
            setFormData(d => ({ ...d, currentPassword: '', newPassword: '', confirmPassword: '' }));
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Failed to change password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-transition space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-[var(--text-primary)] font-display tracking-tight mb-2">My Profile</h1>
                    <p className="text-[var(--text-secondary)] font-medium">Manage your personal information and security settings</p>
                </div>
                <div className="px-4 py-2 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] backdrop-blur-md flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Account Verified</span>
                </div>
            </div>

            <AnimatePresence>
                {(error || success) && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={cn(
                            "p-4 rounded-2xl border flex items-center gap-4 text-xs font-black uppercase tracking-widest",
                            error ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        )}
                    >
                        {error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                        {error || success}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Matrix Tabs */}
            <div className="flex border-b border-[var(--border-subtle)]/30 gap-6 sm:gap-10 overflow-x-auto no-scrollbar">
                {(['info', 'security', 'history'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={cn("pb-6 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative whitespace-nowrap",
                        activeTab === tab ? "text-[var(--primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]")}>
                        {t(`common.${tab}`)}
                        {activeTab === tab && <motion.div layoutId="profile-tab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--primary)] shadow-[0_0_10px_var(--primary)]" />}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="nx-card p-8 text-center relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--accent)]/20 opacity-30" />

                        <div className="relative mt-8 mb-6 inline-block">
                            <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] p-1 shadow-2xl shadow-[var(--primary)]/20 transition-transform group-hover:scale-105 duration-500">
                                <div className="w-full h-full rounded-[2.4rem] bg-[var(--bg-card)] flex items-center justify-center overflow-hidden">
                                    {user.avatar ? (
                                        <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={64} className="text-[var(--text-muted)]" />
                                    )}
                                </div>
                            </div>
                            <input 
                              type="file" 
                              id="avatar-upload" 
                              className="hidden" 
                              accept="image/*" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                
                                setLoading(true);
                                setError('');
                                setSuccess('');
                                
                                try {
                                  // 🚀 CLIENT-SIDE OPTIMIZATION: Resize & Compress
                                  const optimizedBase64 = await optimizeImage(file, { maxWidth: 400, maxHeight: 400, quality: 0.8 });
                                  
                                  const res = await api.post(`/users/${user.id}/avatar`, { image: optimizedBase64 });
                                  const newUrl = res.data.url;
                                  
                                  // Sync Local State
                                  const stored = JSON.parse(localStorage.getItem('mcb_user') || '{}');
                                  stored.avatar = newUrl;
                                  localStorage.setItem('mcb_user', JSON.stringify(stored));
                                  
                                  setSuccess('Avatar updated successfully.');
                                  setTimeout(() => window.location.reload(), 1500); // Allow toast to be seen
                                } catch (err: any) {
                                  console.error('[Profile Avatar Failure]:', err);
                                  setError(err?.response?.data?.error || 'Failed to upload image.');
                                } finally {
                                  setLoading(false);
                                }
                              }}
                            />
                            {canEditIdentity && (
                                <button 
                                    onClick={() => document.getElementById('avatar-upload')?.click()}
                                    className="absolute bottom-0 right-0 w-10 h-10 rounded-xl bg-[var(--primary)] text-white border-4 border-[var(--bg-card)] flex items-center justify-center hover:scale-110 transition-all shadow-xl active:scale-95"
                                >
                                    <Camera size={16} />
                                </button>
                            )}
                        </div>

                        <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight mb-1">{user?.name}</h2>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--primary)] mb-6">{user?.role?.replace('_', ' ')}</p>

                        <div className="space-y-3 pt-6 border-t border-[var(--border-subtle)] mx-4">
                            <div className="flex items-center gap-3 text-[var(--text-secondary)] text-xs py-2">
                                <Building2 size={14} className="text-[var(--text-muted)]" />
                                <span className="font-bold flex-1 text-left">Organization</span>
                                <span className="text-[var(--text-primary)] font-black">{user?.organizationId}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[var(--text-secondary)] text-xs py-2">
                                <Shield size={14} className="text-[var(--text-muted)]" />
                                <span className="font-bold flex-1 text-left">Security Level</span>
                                <span className="text-amber-500 font-black">Grade {user?.rank || 50}</span>
                            </div>
                        </div>
                    </div>

                    <div className="nx-card p-8 space-y-6">
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-primary)]">Security Status</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                    <CheckCircle2 size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">2FA Enabled</p>
                                    <p className="text-[9px] font-bold text-[var(--text-secondary)]">Enhanced account protection</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                    <CheckCircle2 size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">Identity Verified</p>
                                    <p className="text-[9px] font-bold text-[var(--text-secondary)]">Government ID approved</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Forms / Content Area */}
                <div className="lg:col-span-2">
                    <AnimatePresence mode="wait">
                        {activeTab === 'info' && (
                            <motion.div key="info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                                <div className="nx-card p-8 md:p-10">
                                    <div className="flex items-center gap-4 mb-10">
                                        <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)]">
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Personal Information</h3>
                                            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Update your contact details</p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleUpdateInfo} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Full Name</label>
                                                <div className="relative group">
                                                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-all" />
                                                    <input
                                                        type="text"
                                                        value={formData.fullName}
                                                        onChange={e => setFormData(d => ({ ...d, fullName: e.target.value }))}
                                                        className={cn("nx-input nx-input-l", !canEditIdentity && "opacity-50 cursor-not-allowed bg-[var(--bg-elevated)]")}
                                                        placeholder="Your Name"
                                                        disabled={!canEditIdentity}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Email Terminal</label>
                                                <div className="relative group">
                                                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-all" />
                                                    <input
                                                        type="email"
                                                        value={formData.email}
                                                        onChange={e => setFormData(d => ({ ...d, email: e.target.value }))}
                                                        className={cn("nx-input nx-input-l", !canEditIdentity && "opacity-50 cursor-not-allowed bg-[var(--bg-elevated)]")}
                                                        placeholder="email@example.com"
                                                        disabled={!canEditIdentity}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Phone Number</label>
                                                <div className="relative group">
                                                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-all" />
                                                    <input
                                                        type="tel"
                                                        value={formData.phone}
                                                        onChange={e => setFormData(d => ({ ...d, phone: e.target.value }))}
                                                        className="nx-input nx-input-l"
                                                        placeholder="+233 XX XXX XXXX"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pt-4">
                                            {!canEditIdentity && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowRequestModal(true)}
                                                    className="px-6 py-4 rounded-2xl bg-gradient-to-br from-[var(--primary)]/10 to-[var(--accent)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-3 active:scale-95"
                                                >
                                                    <Mail size={16} />
                                                    <span>Request Update</span>
                                                </button>
                                            )}
                                            <div className="flex-1" />
                                            {canEditIdentity && (
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="btn-primary px-10 py-4 flex items-center gap-3 disabled:opacity-50"
                                                >
                                                    {loading && <Loader2 size={16} className="animate-spin" />}
                                                    <span>Save Changes</span>
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                </div>

                                {/* Digital Identity Section */}
                                <div className="nx-card p-8 md:p-10 relative overflow-hidden">
                                     <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/5 rounded-bl-full pointer-events-none" />
                                     <div className="flex items-center gap-4 mb-10">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                                            <Fingerprint size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Digital Identity</h3>
                                            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Manage your electronic Wet-Signature</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                        <div className="space-y-6">
                                            <p className="text-xs font-medium text-[var(--text-secondary)] leading-relaxed">
                                                Your digital signature is used to authorize official institutional records, including performance appraisals, target acknowledgments, and sanction mandates.
                                            </p>
                                            
                                            {signatureUrl ? (
                                                <div className="space-y-4">
                                                    <div className="p-6 rounded-3xl bg-white border border-[var(--border-subtle)] flex items-center justify-center min-h-[160px] group relative shadow-inner">
                                                        <img src={signatureUrl} alt="Signature" className="max-h-24 object-contain" />
                                                        <button 
                                                            onClick={async () => {
                                                                if (!window.confirm('Are you sure you want to remove your digital signature?')) return;
                                                                setLoading(true);
                                                                try {
                                                                    await api.post(`/users/${user.id}/signature`, { image: 'none' });
                                                                    setSignatureUrl(null);
                                                                    setSuccess('Signature removed.');
                                                                } catch (err) {
                                                                    setError('Failed to remove signature.');
                                                                } finally {
                                                                    setLoading(false);
                                                                }
                                                            }}
                                                            className="absolute top-4 right-4 p-2 rounded-xl bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                                        <CheckCircle2 size={12} className="text-emerald-500" />
                                                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Active Identity Synchronized</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-8 rounded-3xl border-2 border-dashed border-[var(--border-subtle)] flex flex-col items-center justify-center text-center space-y-3 opacity-60">
                                                    <Fingerprint size={32} className="text-[var(--text-muted)]" />
                                                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">No Signature Registered</p>
                                                </div>
                                            )}

                                            <div className="pt-6 border-t border-[var(--border-subtle)]/30 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Alternative Protocol</label>
                                                    <span className="text-[8px] font-bold text-[var(--primary)] uppercase tracking-tight">PNG / JPG / WEBP</span>
                                                </div>
                                                
                                                <input 
                                                    type="file" 
                                                    id="signature-file-upload" 
                                                    className="hidden" 
                                                    accept="image/png,image/jpeg,image/webp"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        setLoading(true);
                                                        try {
                                                          const reader = new FileReader();
                                                          reader.onloadend = async () => {
                                                            const base64 = reader.result as string;
                                                            const res = await api.post(`/users/${user.id}/signature`, { image: base64 });
                                                            setSignatureUrl(res.data.url);
                                                            setSuccess('Signature image synchronized successfully.');
                                                          };
                                                          reader.readAsDataURL(file);
                                                        } catch (err) {
                                                          setError('Failed to synchronize signature asset.');
                                                        } finally {
                                                          setLoading(false);
                                                        }
                                                    }}
                                                />
                                                <button 
                                                    onClick={() => document.getElementById('signature-file-upload')?.click()}
                                                    className="w-full py-5 rounded-[2rem] bg-indigo-500 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 hover:bg-indigo-600 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                                >
                                                    <Camera size={16} />
                                                    Upload Digital Signature Asset
                                                </button>
                                                <p className="text-[9px] text-[var(--text-muted)] text-center font-medium italic">Highest resolution transparent PNG recommended</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Draw New Signature</label>
                                            <SignaturePad 
                                                onSave={async (base64) => {
                                                    setLoading(true);
                                                    try {
                                                        const res = await api.post(`/users/${user.id}/signature`, { image: base64 });
                                                        setSignatureUrl(res.data.url);
                                                        setSuccess('Digital signature registered successfully.');
                                                    } catch (err) {
                                                        setError('Failed to register signature.');
                                                    } finally {
                                                        setLoading(false);
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'security' && (
                            <motion.div key="security" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                                <div className="nx-card p-8 md:p-10">
                                    <div className="flex items-center gap-4 mb-10">
                                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                                            <Lock size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Security Credentials</h3>
                                            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Rotate your security key regularly</p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleChangePassword} className="space-y-6">
                                        <div className="space-y-2 max-w-md">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Current Password</label>
                                            <input
                                                type="password"
                                                value={formData.currentPassword}
                                                onChange={e => setFormData(d => ({ ...d, currentPassword: e.target.value }))}
                                                className="nx-input"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">New Password</label>
                                                <input
                                                    type="password"
                                                    value={formData.newPassword}
                                                    onChange={e => setFormData(d => ({ ...d, newPassword: e.target.value }))}
                                                    className="nx-input"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Confirm New Password</label>
                                                <input
                                                    type="password"
                                                    value={formData.confirmPassword}
                                                    onChange={e => setFormData(d => ({ ...d, confirmPassword: e.target.value }))}
                                                    className="nx-input"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-4">
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="btn-primary bg-amber-600 hover:bg-amber-500 shadow-amber-500/20 px-10 py-4 flex items-center gap-3 disabled:opacity-50"
                                            >
                                                {loading && <Loader2 size={16} className="animate-spin" />}
                                                <span>Rotate Key</span>
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'history' && (
                            <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <HistoryLog logs={history} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* 🎫 Request Update Modal */}
            <AnimatePresence>
                {showRequestModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="w-full max-w-lg nx-card p-10 space-y-8 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--primary)]/20 to-transparent rounded-bl-full pointer-events-none opacity-50" />
                            
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] border border-[var(--primary)]/20">
                                    <Mail size={28} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Formal Update Report</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">Personnel Information Correction</p>
                                </div>
                                <button onClick={() => setShowRequestModal(false)} className="text-[var(--text-muted)] hover:text-rose-500 transition-colors">
                                    <AlertCircle size={24} />
                                </button>
                            </div>

                            <p className="text-xs font-medium text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-elevated)]/50 p-4 rounded-xl border border-[var(--border-subtle)]/50 italic">
                                "Self-service identity editing is restricted to HR and IT departments. If any information in your summary is incorrect, please provide the details below and submit a formal report to the Support Center."
                            </p>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Proposed Amendments (Details)</label>
                                <textarea 
                                    value={requestMsg}
                                    onChange={e => setRequestMsg(e.target.value)}
                                    placeholder="e.g. Please update my phone number to +233 24 XXX XXXX or update the spelling of my name..."
                                    className="nx-input min-h-[150px] resize-none p-6"
                                />
                            </div>

                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setShowRequestModal(false)}
                                    className="flex-1 py-4 rounded-2xl bg-[var(--bg-elevated)] text-[var(--text-primary)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--bg-hover)] transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={async () => {
                                        if (!requestMsg.trim()) return setError('Please provide modification details.');
                                        setIsSubmitting(true);
                                        try {
                                          await api.post('/support/tickets', {
                                            subject: `Profile Update Request: ${user.name}`,
                                            description: requestMsg,
                                            category: 'USER_IDENTITY',
                                            priority: 'NORMAL'
                                          });
                                          setSuccess('Your update request has been submitted to the Support Inbox.');
                                          setShowRequestModal(false);
                                          setRequestMsg('');
                                        } catch (err) {
                                          setError('Failed to submit report. Please try again.');
                                        } finally {
                                          setIsSubmitting(false);
                                        }
                                    }}
                                    disabled={isSubmitting}
                                    className="flex-[2] py-4 rounded-2xl bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[var(--primary)]/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                                    Submit Formal Report
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Profile;
