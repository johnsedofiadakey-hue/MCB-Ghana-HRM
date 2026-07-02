import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mail, Phone, Briefcase, Calendar,
  Shield, Edit2, ChevronLeft, Download, FileText,
  Activity, Target, Zap, Building, Key, Lock, ShieldCheck, Globe, Clock, Umbrella,
  UserCheck, Award, QrCode, Copy, CheckCheck, RefreshCw, Link2, MoreHorizontal,
  Send, UserPlus, TrendingUp, Users, ChevronRight, AlertOctagon
} from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { getStoredUser, getRoleRankValue } from '../utils/session';
import { toast } from '../utils/toast';
import { useTranslation } from 'react-i18next';
import { useAI } from '../context/AIContext';
import { useTheme } from '../context/ThemeContext';
import { getSafeAvatarUrl } from '../utils/avatar';
import HistoryLog from '../components/profile/HistoryLog';
import EmployeeIDCard from '../components/profile/EmployeeIDCard';
import DocumentVault from '../components/employee/DocumentVault';
import { QRCodeCanvas } from 'qrcode.react';

const getThemeConfigs = (themeName: string, primaryColor: string, accentColor: string) => {
    const brandPrimary = primaryColor || '#009EE3';
    const brandAccent = accentColor || '#EE7100';

    switch (themeName) {
        case 'MCB_LIGHT_GOLD':
            return {
                cardBg: "bg-gradient-to-br from-slate-50 via-slate-100/40 to-slate-100",
                textPrimary: "text-slate-900",
                textMuted: "text-slate-500",
                border: "border-[var(--brand-primary)]/20 shadow-[0_8px_30px_rgba(0,0,0,0.03)]",
                tagBg: "bg-[var(--brand-primary)]/10",
                tagBorder: "border-[var(--brand-primary)]/20",
                tagText: "text-[var(--brand-primary)]",
                avatarBorder: "border-[var(--brand-accent)]",
                logoColor: brandPrimary,
                isDark: false,
                styles: {
                    textPrimary: { color: '#0f172a' },
                    tagBg: { backgroundColor: `${brandPrimary}15`, borderColor: `${brandPrimary}30`, color: brandPrimary },
                    avatarBorder: { borderColor: brandAccent }
                }
            };
        case 'MCB_LIGHT_NAVY':
            return {
                cardBg: "bg-gradient-to-br from-slate-50 via-slate-100/40 to-slate-100",
                textPrimary: "text-slate-900",
                textMuted: "text-slate-500",
                border: "border-[var(--brand-primary)]/20 shadow-[0_8px_30px_rgba(0,0,0,0.03)]",
                tagBg: "bg-[var(--brand-accent)]/10",
                tagBorder: "border-[var(--brand-accent)]/20",
                tagText: "text-[var(--brand-accent)]",
                avatarBorder: "border-[var(--brand-primary)]",
                logoColor: brandPrimary,
                isDark: false,
                styles: {
                    textPrimary: { color: brandPrimary },
                    tagBg: { backgroundColor: `${brandAccent}15`, borderColor: `${brandAccent}30`, color: brandAccent },
                    avatarBorder: { borderColor: brandPrimary }
                }
            };
        case 'GHANA_SUNSHINE_LIGHT':
            return {
                cardBg: "bg-gradient-to-br from-slate-50 via-slate-100/40 to-slate-100",
                textPrimary: "text-slate-900",
                textMuted: "text-slate-500",
                border: "border-[var(--brand-accent)]/20 shadow-[0_8px_30px_rgba(0,0,0,0.03)]",
                tagBg: "bg-[var(--brand-accent)]/10",
                tagBorder: "border-[var(--brand-accent)]/20",
                tagText: "text-[var(--brand-accent)]",
                avatarBorder: "border-[var(--brand-accent)]",
                logoColor: brandAccent,
                isDark: false,
                styles: {
                    textPrimary: { color: '#0f172a' },
                    tagBg: { backgroundColor: `${brandAccent}15`, borderColor: `${brandAccent}30`, color: brandAccent },
                    avatarBorder: { borderColor: brandAccent }
                }
            };
        case 'MIDNIGHT_LUXURY':
            return {
                cardBg: "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950",
                textPrimary: "text-slate-100",
                textMuted: "text-slate-400",
                border: "border-[var(--brand-primary)]/30 shadow-[0_8px_30px_rgba(0,0,0,0.4)]",
                tagBg: "bg-[var(--brand-primary)]/15",
                tagBorder: "border-[var(--brand-primary)]/30",
                tagText: "text-[var(--brand-primary)]",
                avatarBorder: "border-[var(--brand-primary)]",
                logoColor: brandPrimary,
                isDark: true,
                styles: {
                    textPrimary: { color: '#f8fafc' },
                    tagBg: { backgroundColor: `${brandPrimary}20`, borderColor: `${brandPrimary}45`, color: brandPrimary },
                    avatarBorder: { borderColor: brandPrimary }
                }
            };
        case 'GHANA_SUNSHINE':
            return {
                cardBg: "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950",
                textPrimary: "text-slate-100",
                textMuted: "text-slate-400",
                border: "border-[var(--brand-accent)]/30 shadow-[0_8px_30px_rgba(0,0,0,0.4)]",
                tagBg: "bg-[var(--brand-accent)]/15",
                tagBorder: "border-[var(--brand-accent)]/30",
                tagText: "text-[var(--brand-accent)]",
                avatarBorder: "border-[var(--brand-accent)]",
                logoColor: brandAccent,
                isDark: true,
                styles: {
                    textPrimary: { color: '#f8fafc' },
                    tagBg: { backgroundColor: `${brandAccent}25`, borderColor: `${brandAccent}50`, color: brandAccent },
                    avatarBorder: { borderColor: brandAccent }
                }
            };
        case 'MCB_GOLD':
        default:
            return {
                cardBg: "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950",
                textPrimary: "text-slate-100",
                textMuted: "text-slate-400",
                border: "border-[var(--brand-primary)]/30 shadow-[0_8px_30px_rgba(0,0,0,0.4)]",
                tagBg: "bg-[var(--brand-accent)]/15",
                tagBorder: "border-[var(--brand-accent)]/30",
                tagText: "text-[var(--brand-accent)]",
                avatarBorder: "border-[var(--brand-accent)]",
                logoColor: brandAccent,
                isDark: true,
                styles: {
                    textPrimary: { color: '#f8fafc' },
                    tagBg: { backgroundColor: `${brandPrimary}20`, borderColor: `${brandPrimary}45`, color: brandAccent },
                    avatarBorder: { borderColor: brandAccent }
                }
            };
    }
};

const EmployeeProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [employee, setEmployee] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [kpiSummary, setKpiSummary] = useState<any>(null);

    const onboardingRef = useRef<HTMLElement>(null);
    const performanceRef = useRef<HTMLElement>(null);
    const documentsRef = useRef<HTMLElement>(null);

    const [connectionData, setConnectionData] = useState<{ views: number; connections: any[] }>({ views: 0, connections: [] });
    const [userCard, setUserCard] = useState<any>(null);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loadingConnections, setLoadingConnections] = useState(false);
    const [nfcWriting, setNfcWriting] = useState(false);
    const [nfcSuccess, setNfcSuccess] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [leaveAdjustForm, setLeaveAdjustForm] = useState({ leaveBalance: '', leaveAllowance: '', reason: '' });
    const [adjustingLeave, setAdjustingLeave] = useState(false);
    const [riskProfile, setRiskProfile] = useState<any>(null);
    const [printType, setPrintType] = useState<'idcard' | null>(null);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [showPromotionModal, setShowPromotionModal] = useState(false);
    const [submittingPromotion, setSubmittingPromotion] = useState(false);
    const [promotionForm, setPromotionForm] = useState({
        targetRole: 'STAFF',
        targetJobTitle: '',
        proposedSalary: '',
        reason: ''
    });
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [inviteData, setInviteData] = useState<any>(null);
    const [probationRecord, setProbationRecord] = useState<any>(null);
    const [probationLoading, setProbationLoading] = useState(false);
    const [loadingInvite, setLoadingInvite] = useState(false);
    const [regeneratingInvite, setRegeneratingInvite] = useState(false);
    const [showMoreActions, setShowMoreActions] = useState(false);
    const [myDisciplinaryCases, setMyDisciplinaryCases] = useState<any[]>([]);
    const [acknowledgingCaseId, setAcknowledgingCaseId] = useState<string | null>(null);
    const { t } = useTranslation();
    const { setContextData } = useAI();
    const { settings } = useTheme();

    const currentUser = getStoredUser();
    const normalizedRole = (currentUser?.role || '').toUpperCase().replace(/ /g, '_');

    const fetchEmployee = useCallback(async () => {
        setLoading(true);
        try {
            const [empRes, kpiRes, riskRes] = await Promise.all([
                api.get(`/employees/${id}`),
                api.get(`/kpis/summary/individual?employeeId=${id}`).catch(() => ({ data: { averageScore: 0 } })),
                getRoleRankValue(currentUser?.role) >= 75 ? api.get(`/employees/${id}/risk`).catch(() => null) : Promise.resolve(null)
            ]);
            setEmployee(empRes.data);
            setKpiSummary(kpiRes.data);
            if (riskRes) setRiskProfile(riskRes.data);
            setPromotionForm(prev => ({ ...prev, targetJobTitle: empRes.data.jobTitle }));
            fetchInviteData(id);
            if (getRoleRankValue(currentUser?.role) >= 92 || currentUser?.role === 'DEV') {
                api.get(`/hr/probation?employeeId=${id}`).then(r => {
                    const records = Array.isArray(r.data) ? r.data : [];
                    setProbationRecord(records[0] || null);
                }).catch(() => {});
            }
        } catch (e) {
            console.error(e);
            toast.error('Error: Staff record not found');
            navigate('/employees');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        fetchEmployee();
    }, [fetchEmployee]);

    const fetchConnections = useCallback(async () => {
        if (!id) return;
        try {
            setLoadingConnections(true);
            const [connRes, cardRes] = await Promise.all([
                api.get('/call-cards/connections'),
                api.get(`/call-cards/employee/${id}`).catch(() => null)
            ]);
            if (connRes?.data) setConnectionData(connRes.data);
            if (cardRes?.data) setUserCard(cardRes.data);
        } catch (e) {
            console.error('[EmployeeProfile] Failed to fetch call card connection logs:', e);
        } finally {
            setLoadingConnections(false);
        }
    }, [id]);

    useEffect(() => {
        if (employee && currentUser?.id === employee.id) {
            fetchConnections();
        }
    }, [employee, currentUser, fetchConnections]);

    const fetchMyDisciplinaryCases = useCallback(async () => {
        try {
            const res = await api.get('/hr/disciplinary/mine');
            setMyDisciplinaryCases(Array.isArray(res.data) ? res.data : []);
        } catch {
            setMyDisciplinaryCases([]);
        }
    }, []);

    useEffect(() => {
        if (employee && currentUser?.id === employee.id) {
            fetchMyDisciplinaryCases();
        }
    }, [employee, currentUser, fetchMyDisciplinaryCases]);

    const handleAcknowledgeCase = async (caseId: string) => {
        setAcknowledgingCaseId(caseId);
        try {
            await api.post(`/hr/disciplinary/${caseId}/acknowledge`);
            toast.success('Acknowledged');
            fetchMyDisciplinaryCases();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to acknowledge');
        } finally {
            setAcknowledgingCaseId(null);
        }
    };

    const handleWriteNFC = async () => {
        if (!userCard?.id) {
            toast.error("Please configure your Digital Call Card before writing to NFC.");
            return;
        }
        const publicUrl = `${window.location.origin}/shared-card/${userCard.id}`;
        if (!('NDEFReader' in window)) {
            toast.error("Web NFC is not supported by your current browser or device.");
            return;
        }
        try {
            setNfcWriting(true);
            const ndef = new (window as any).NDEFReader();
            await ndef.write({ records: [{ recordType: "url", data: publicUrl }] });
            setNfcSuccess(true);
            toast.success("Successfully programmed Call Card URL to physical NFC tag!");
            setTimeout(() => setNfcSuccess(false), 5000);
        } catch (err: any) {
            toast.error(`NFC Programming failed: ${err.message || 'Verification timed out.'}`);
        } finally {
            setNfcWriting(false);
        }
    };

    const handleExportCSV = () => {
        if (!connectionData.connections.length) { toast.error("No connections to export."); return; }
        const headers = ["Full Name", "Email Address", "Phone Number", "Company", "Notes", "Exchanged Date"];
        const rows = connectionData.connections.map(c => [
            c.fullName, c.email, c.phone || "", c.company || "", c.notes || "",
            new Date(c.createdAt).toLocaleString()
        ]);
        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `MCB_Ghana_Connections_${employee.fullName.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Connection log exported as CSV.");
    };

    useEffect(() => {
        if (employee) setContextData({ ...employee, kpiSummary });
        return () => setContextData(null);
    }, [employee, kpiSummary, setContextData]);

    const handlePromotionSubmit = async () => {
        if (!promotionForm.reason || !promotionForm.targetRole) {
            toast.error('Please provide a target role and reason'); return;
        }
        setSubmittingPromotion(true);
        try {
            await api.post('/hr/promotions', { employeeId: id, ...promotionForm });
            toast.success('Promotion request submitted to HR');
            setShowPromotionModal(false);
            setPromotionForm({ targetRole: 'STAFF', targetJobTitle: employee?.jobTitle || '', proposedSalary: '', reason: '' });
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to submit promotion request');
        } finally {
            setSubmittingPromotion(false);
        }
    };

    const handleResetPassword = async () => {
        setResetting(true);
        try {
            await api.post(`/employees/${id}/reset-password`);
            toast.success('Secure password-reset invitation sent');
            setShowResetModal(false);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to send password-reset invitation');
        } finally {
            setResetting(false);
        }
    };

    const handleAdjustLeave = async () => {
        if (!leaveAdjustForm.leaveBalance || !leaveAdjustForm.leaveAllowance || !leaveAdjustForm.reason) {
            toast.error('All fields are required'); return;
        }
        setAdjustingLeave(true);
        try {
            await api.post('/leave/balance/adjust', {
                targetUserId: id,
                leaveBalance: Number(leaveAdjustForm.leaveBalance),
                leaveAllowance: Number(leaveAdjustForm.leaveAllowance),
                reason: leaveAdjustForm.reason
            });
            toast.success('Leave balance updated successfully');
            setShowLeaveModal(false);
            setLeaveAdjustForm({ leaveBalance: '', leaveAllowance: '', reason: '' });
            fetchEmployee();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Adjustment failed');
        } finally {
            setAdjustingLeave(false);
        }
    };

    const handleExportDossier = async () => {
        setExportingPdf(true);
        try {
            const res = await api.get(`/export/employee/${id}/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Employee_Dossier_${employee.fullName.replace(/\s+/g, '_')}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            toast.error('Failed to generate employee dossier PDF');
        } finally {
            setExportingPdf(false);
        }
    };

    const handleCopy = (text: string, field: string) => {
        if (!text || text === '—') return;
        navigator.clipboard.writeText(text).then(() => {
            setCopiedField(field);
            toast.success('Copied to clipboard');
            setTimeout(() => setCopiedField(null), 2000);
        });
    };

    const fetchInviteData = async (employeeId: string) => {
        const rank = getRoleRankValue(currentUser?.role);
        if (rank < 85) return;
        setLoadingInvite(true);
        try {
            const res = await api.get(`/employees/${employeeId}/onboarding-invite`);
            setInviteData(res.data);
        } catch {
            // Not an error if employee has no invite token
        } finally {
            setLoadingInvite(false);
        }
    };

    const handleRegenerateInvite = async () => {
        setRegeneratingInvite(true);
        try {
            const res = await api.post(`/employees/${id}/regenerate-invite`);
            setInviteData({ ...res.data, usedAt: null, isExpired: false });
            toast.success('New invite link generated — valid for 7 days');
        } catch {
            toast.error('Failed to generate invite link');
        } finally {
            setRegeneratingInvite(false);
        }
    };

    const handleToggleInvite = async (enable: boolean) => {
        try {
            const res = await api.post(`/employees/${id}/toggle-invite`, { enabled: enable });
            if (enable) {
                setInviteData({ inviteUrl: res.data.inviteUrl, expiresAt: res.data.expiresAt, usedAt: null, isExpired: false, enabled: true });
                toast.success('Profile unlocked — invite link is now active');
            } else {
                setInviteData((prev: any) => ({ ...prev, isExpired: true, enabled: false }));
                toast.success('Profile locked — employee cannot make self-service changes');
            }
        } catch {
            toast.error('Toggle failed');
        }
    };

    if (loading) {
        return (
            <div className="py-40 flex flex-col items-center justify-center gap-6">
                <div className="w-16 h-16 rounded-full border-4 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)]">Loading Staff Profile</p>
            </div>
        );
    }

    const StatMini = ({ icon: Icon, label, value, color, copyable, copyKey }: any) => (
        <div
            className={cn("flex items-center gap-3 p-4 rounded-2xl bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)]/50 overflow-hidden min-w-0 group transition-all", copyable && value && value !== '—' ? "cursor-pointer hover:border-[var(--primary)]/30 hover:bg-[var(--bg-elevated)]/50" : "")}
            onClick={copyable ? () => handleCopy(value, copyKey || label) : undefined}
            title={copyable && value && value !== '—' ? `Click to copy ${label}` : undefined}
        >
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border border-[var(--border-subtle)] flex-shrink-0", color || 'text-[var(--primary)] bg-[var(--primary)]/5')}>
                <Icon size={16} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60 truncate">{label}</p>
                <p className="text-sm font-bold text-[var(--text-primary)] truncate" title={value}>{value}</p>
            </div>
            {copyable && value && value !== '—' && (
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {copiedField === (copyKey || label) ? <CheckCheck size={14} className="text-emerald-500" /> : <Copy size={14} className="text-[var(--text-muted)]" />}
                </div>
            )}
        </div>
    );

    const SectionHeading = ({ icon: Icon, title, action }: { icon: any; title: string; action?: React.ReactNode }) => (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                    <Icon size={16} />
                </div>
                <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)]">{title}</h2>
            </div>
            {action}
        </div>
    );

    const leaveAllowance = Number(employee.leaveAllowance || 24);
    const leaveBalance = Number(employee.leaveBalance || 0);
    const leaveConsumed = Math.max(0, leaveAllowance - leaveBalance);
    const leaveUsedPct = leaveAllowance > 0 ? Math.round((leaveConsumed / leaveAllowance) * 100) : 0;
    const performanceScore = Math.round(kpiSummary?.averageScore || 0);
    const completedAppraisals = employee.appraisalPackets?.filter((p: any) => p.status === 'COMPLETED').length || 0;

    const isHRAdmin = getRoleRankValue(currentUser?.role) >= 85;
    const isOwnProfile = currentUser?.id === employee.id;
    const linkIsActive = inviteData?.inviteUrl && !inviteData?.isExpired && !inviteData?.usedAt;
    const profileLocked = !linkIsActive && (employee.employeeLifecycleStage === 'PROFILE_LOCKED' || employee.employeeLifecycleStage === 'ACTIVE' || employee.employeeLifecycleStage === 'ONBOARDING');

    return (
        <div className="space-y-10 pb-32 print:p-0">
            {/* Print components — hidden in UI */}
            <div className="print:block hidden">
                {printType === 'idcard' && <EmployeeIDCard employee={employee} />}
            </div>

            {/* ─────────────────────────────────────────────
                MAIN UI
            ───────────────────────────────────────────── */}
            <div className="print:hidden space-y-10">

                {/* ── Navigation & Action Bar ── */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <button onClick={() => navigate('/employees')} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-[var(--primary)] transition-all">
                        <ChevronLeft size={16} /> Back
                    </button>
                    <div className="flex items-center gap-2 flex-wrap">
                        <motion.button
                            onClick={handleExportDossier}
                            disabled={exportingPdf}
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            className="px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {exportingPdf ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />} {exportingPdf ? 'Generating...' : 'Export PDF'}
                        </motion.button>

                        {((currentUser?.rank || 0) >= 75 || currentUser?.role === 'DEV') && (
                            <motion.button onClick={() => setShowLeaveModal(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-4 py-2.5 rounded-xl bg-[var(--info)]/10 border border-[var(--info)]/20 text-[10px] font-black uppercase tracking-widest text-[var(--info)] hover:bg-[var(--info)] hover:text-white transition-all flex items-center gap-2">
                                <Umbrella size={13} /> Leave
                            </motion.button>
                        )}

                        {currentUser?.id !== employee.id && (
                            <div className="relative">
                                <motion.button
                                    onClick={() => setShowMoreActions(prev => !prev)}
                                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    className="px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center gap-2"
                                >
                                    <MoreHorizontal size={15} /> More
                                </motion.button>
                                {showMoreActions && (
                                    <div className="absolute right-0 top-full mt-2 z-50 w-52 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden" onMouseLeave={() => setShowMoreActions(false)}>
                                        {((currentUser?.rank || 0) >= 85 || currentUser?.role === 'DEV') && (
                                            <button onClick={() => { setShowResetModal(true); setShowMoreActions(false); }} className="w-full px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-amber-600 hover:bg-amber-500/10 transition-all flex items-center gap-3">
                                                <Key size={13} /> Reset Password
                                            </button>
                                        )}
                                        {(currentUser?.id === employee.supervisorId || (currentUser?.rank || 0) >= 85) && (
                                            <button onClick={() => { setShowPromotionModal(true); setShowMoreActions(false); }} className="w-full px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-500/10 transition-all flex items-center gap-3">
                                                <Zap size={13} /> Suggest Promotion
                                            </button>
                                        )}
                                        {(normalizedRole === 'IT_MANAGER' || normalizedRole === 'IT_ADMIN' || normalizedRole === 'DEV') && (
                                            <button onClick={() => { setPrintType('idcard'); setShowMoreActions(false); setTimeout(() => window.print(), 500); }} className="w-full px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-all flex items-center gap-3">
                                                <FileText size={13} /> Print ID Card
                                            </button>
                                        )}
                                        {getRoleRankValue(currentUser?.role) >= 88 && (
                                            <button
                                                onClick={() => {
                                                    setShowMoreActions(false);
                                                    onboardingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                }}
                                                className="w-full px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-all flex items-center gap-3"
                                            >
                                                <Link2 size={13} /> Onboarding Link
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {((currentUser?.rank || 0) >= 85 || currentUser?.id === employee.id) && (
                            <motion.button onClick={() => navigate('/employees?edit=' + employee.id)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-6 py-2.5 rounded-xl bg-[var(--primary)] text-[var(--text-inverse)] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-[var(--primary)]/30 flex items-center gap-2">
                                <Edit2 size={13} /> Edit Profile
                            </motion.button>
                        )}
                    </div>
                </div>

                {/* ── Profile Hero ── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="nx-card p-10 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)] border-[var(--border-subtle)] relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-[var(--primary)]/5 blur-[120px] skew-x-12 translate-x-1/2 pointer-events-none" />

                    <div className="flex flex-col md:flex-row gap-10 items-center md:items-start relative z-10">
                        <div className="relative group">
                            <div className="w-44 h-44 rounded-[2.5rem] overflow-hidden ring-8 ring-[var(--border-subtle)]/30 shadow-2xl transition-transform group-hover:scale-[1.02] bg-[var(--bg-elevated)]">
                                <img
                                    src={getSafeAvatarUrl(employee.avatarUrl, employee.fullName)}
                                    alt={employee.fullName}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).src = getSafeAvatarUrl(undefined, employee.fullName); }}
                                />
                            </div>
                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xl whitespace-nowrap">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-primary)]">
                                    {employee.role === 'DEV' ? 'MANAGEMENT' : `RANK: ${t(`employees.roles.${employee.role}`)}`} <span className="opacity-40 px-1">·</span> {employee.role === 'DEV' ? 'VERIFIED' : `LEVEL ${getRoleRankValue(employee.role)}`}
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 text-center md:text-left space-y-10 pt-2">
                            <div className="space-y-3">
                                <div className="flex flex-wrap justify-center md:justify-start items-center gap-4">
                                    <h1 className="text-5xl font-black text-[var(--text-primary)] tracking-tighter uppercase leading-tight">{employee.fullName}</h1>
                                    <span className="px-4 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[9px] font-black tracking-widest flex items-center gap-2">
                                        <ShieldCheck size={14} /> VERIFIED
                                    </span>
                                    {riskProfile && (
                                        <span className={cn(
                                            "px-4 py-1.5 rounded-xl text-[9px] font-black tracking-widest flex items-center gap-2",
                                            riskProfile.overallRisk === 'CRITICAL' ? "bg-rose-500/10 border-rose-500/20 text-rose-600 animate-bounce" :
                                            riskProfile.overallRisk === 'HIGH' ? "bg-orange-500/10 border-orange-500/20 text-orange-600" :
                                            riskProfile.overallRisk === 'MEDIUM' ? "bg-amber-500/10 border-amber-500/20 text-amber-600" :
                                            "bg-blue-500/10 border-blue-500/20 text-blue-600"
                                        )}>
                                            <Zap size={14} /> FLIGHT RISK: {riskProfile.overallRisk}
                                        </span>
                                    )}
                                    {employee.isOnLeave && (
                                        <span className="px-4 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[9px] font-black tracking-widest flex items-center gap-2 animate-pulse">
                                            <Clock size={14} /> ON LEAVE
                                        </span>
                                    )}
                                </div>
                                <p className="text-lg font-bold text-[var(--text-secondary)] opacity-80 flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1">
                                    <Briefcase className="text-[var(--primary)]" size={20} />
                                    {employee.jobTitle}
                                    <span className="text-[var(--border-subtle)]">·</span>
                                    <span className="flex items-center gap-1.5 text-[var(--primary)] font-black uppercase text-[12px] tracking-widest bg-[var(--primary)]/5 px-2 py-0.5 rounded-lg border border-[var(--primary)]/10">
                                        <Building size={14} /> {employee.department || employee.departmentObj?.name || t('common.unassigned_dept')}
                                    </span>
                                    <span className="hidden md:inline text-[var(--border-subtle)]">·</span>
                                    <span className="text-[11px] uppercase tracking-[0.2em] font-black opacity-60 italic">{employee.employeeCode}</span>
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                                <StatMini icon={Mail} label="Email Address" value={employee.email} color="text-orange-500 bg-orange-500/5" copyable copyKey="email" />
                                <StatMini icon={Phone} label="Contact Number" value={employee.contactNumber || '—'} color="text-blue-500 bg-blue-500/5" copyable copyKey="phone" />
                                <StatMini
                                    icon={Building}
                                    label={t('employees.dept') || "Departmental Unit"}
                                    value={employee.department || employee.departmentObj?.name || t('common.unassigned_dept')}
                                    color="text-[var(--primary)] bg-[var(--primary)]/5"
                                />
                                <StatMini icon={Calendar} label="Hire Date" value={new Date(employee.joinDate).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })} color="text-amber-500 bg-amber-500/5" />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ── KPI Summary Tiles ── */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-4"
                >
                    {[
                        {
                            icon: Umbrella,
                            label: 'Leave Days Left',
                            value: leaveBalance,
                            suffix: 'days',
                            sub: `of ${leaveAllowance} total`,
                            color: 'text-amber-500',
                            bg: 'bg-amber-500/5',
                            border: 'border-amber-500/20',
                            bar: leaveAllowance > 0 ? (leaveBalance / leaveAllowance) * 100 : 0,
                            barColor: 'bg-amber-500'
                        },
                        {
                            icon: UserCheck,
                            label: 'Attendance Rate',
                            value: 98,
                            suffix: '%',
                            sub: 'current period',
                            color: 'text-emerald-500',
                            bg: 'bg-emerald-500/5',
                            border: 'border-emerald-500/20',
                            bar: 98,
                            barColor: 'bg-emerald-500'
                        },
                        {
                            icon: Target,
                            label: 'Performance Score',
                            value: performanceScore,
                            suffix: '%',
                            sub: 'avg across cycles',
                            color: 'text-[var(--primary)]',
                            bg: 'bg-[var(--primary)]/5',
                            border: 'border-[var(--primary)]/20',
                            bar: performanceScore,
                            barColor: 'bg-[var(--primary)]'
                        },
                        {
                            icon: Award,
                            label: 'Appraisal Cycles',
                            value: completedAppraisals,
                            suffix: '',
                            sub: 'completed reviews',
                            color: 'text-violet-500',
                            bg: 'bg-violet-500/5',
                            border: 'border-violet-500/20',
                            bar: Math.min(100, completedAppraisals * 20),
                            barColor: 'bg-violet-500'
                        }
                    ].map((kpi, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                            className={cn("nx-card p-6 border space-y-4 relative overflow-hidden group", kpi.bg, kpi.border)}
                        >
                            <div className="flex items-start justify-between">
                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", kpi.bg)}>
                                    <kpi.icon size={18} className={kpi.color} />
                                </div>
                                <TrendingUp size={12} className={cn("opacity-30 mt-1", kpi.color)} />
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-70">{kpi.label}</p>
                                <p className={cn("text-3xl font-black mt-1", kpi.color)}>
                                    {kpi.value}<span className="text-sm ml-0.5 opacity-60">{kpi.suffix}</span>
                                </p>
                                <p className="text-[9px] text-[var(--text-muted)] font-medium mt-0.5">{kpi.sub}</p>
                            </div>
                            <div className="h-1 w-full bg-[var(--bg-card)] rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${kpi.bar}%` }}
                                    transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                                    className={cn("h-full rounded-full", kpi.barColor)}
                                />
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* ── Probation Status (HR Director / DEV only) ── */}
                {(getRoleRankValue(currentUser?.role) >= 92 || currentUser?.role === 'DEV') && (() => {
                    const isHRDirector = currentUser?.role === 'HR_DIRECTOR' || currentUser?.role === 'DEV';
                    const status = probationRecord?.status;
                    const isPassed = status === 'PASSED';
                    const isOnProbation = status === 'IN_PROGRESS' || status === 'EXTENDED';
                    const isFailed = status === 'FAILED';

                    const handleProbationToggle = async (newStatus: string) => {
                        setProbationLoading(true);
                        try {
                            if (!probationRecord) {
                                const startDate = new Date().toISOString().split('T')[0];
                                const res = await api.post('/hr/probation', { employeeId: id, startDate, period: 90 });
                                setProbationRecord(res.data);
                                toast.success('Probation period started');
                            } else {
                                const res = await api.patch(`/hr/probation/${probationRecord.id}`, {
                                    status: newStatus,
                                    outcome: newStatus === 'PASSED' ? 'Employee successfully completed probation period.' : probationRecord.outcome,
                                    reviewDate: new Date().toISOString().split('T')[0],
                                });
                                setProbationRecord(res.data);
                                toast.success(newStatus === 'PASSED' ? 'Probation marked as passed' : `Probation status updated to ${newStatus}`);
                            }
                        } catch (e: any) {
                            toast.error(e?.response?.data?.error || 'Failed to update probation');
                        } finally {
                            setProbationLoading(false);
                        }
                    };

                    return (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "nx-card p-6 border flex flex-col sm:flex-row sm:items-center gap-5",
                                isPassed ? "border-emerald-500/20 bg-emerald-500/[0.03]" :
                                isOnProbation ? "border-amber-500/20 bg-amber-500/[0.03]" :
                                isFailed ? "border-rose-500/20 bg-rose-500/[0.03]" :
                                "border-[var(--border-subtle)] bg-[var(--bg-elevated)]/20"
                            )}
                        >
                            <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0",
                                isPassed ? "bg-emerald-500/10 text-emerald-500" :
                                isOnProbation ? "bg-amber-500/10 text-amber-500" :
                                isFailed ? "bg-rose-500/10 text-rose-500" :
                                "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                            )}>
                                <Shield size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Probation Status</p>
                                <p className={cn("text-[15px] font-black tracking-tight",
                                    isPassed ? "text-emerald-500" : isOnProbation ? "text-amber-500" : isFailed ? "text-rose-500" : "text-[var(--text-muted)]"
                                )}>
                                    {isPassed ? 'Probation Passed' : isOnProbation ? `On Probation${probationRecord?.endDate ? ` · Ends ${new Date(probationRecord.endDate).toLocaleDateString()}` : ''}` : isFailed ? 'Probation Failed' : 'Not on Probation'}
                                </p>
                                {probationRecord?.outcome && <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">{probationRecord.outcome}</p>}
                            </div>
                            {isHRDirector && (
                                <div className="flex gap-2 flex-shrink-0 flex-wrap">
                                    {!probationRecord && (
                                        <button onClick={() => handleProbationToggle('IN_PROGRESS')} disabled={probationLoading}
                                            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all">
                                            {probationLoading ? '...' : 'Start Probation'}
                                        </button>
                                    )}
                                    {isOnProbation && (
                                        <button onClick={() => handleProbationToggle('PASSED')} disabled={probationLoading}
                                            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all">
                                            {probationLoading ? '...' : '✓ Mark as Passed'}
                                        </button>
                                    )}
                                    {isOnProbation && (
                                        <button onClick={() => handleProbationToggle('FAILED')} disabled={probationLoading}
                                            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all">
                                            {probationLoading ? '...' : 'Mark Failed'}
                                        </button>
                                    )}
                                    {isPassed && (
                                        <button onClick={() => handleProbationToggle('IN_PROGRESS')} disabled={probationLoading}
                                            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)] transition-all">
                                            {probationLoading ? '...' : 'Restart Probation'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    );
                })()}

                {/* ── Identity & Leave Grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Identity & Bio */}
                    <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
                        className="nx-card p-8 bg-[var(--bg-elevated)]/20 border border-[var(--border-subtle)] space-y-6"
                    >
                        <SectionHeading icon={Shield} title="Identity & Bio" />
                        <div className="space-y-3">
                            {[
                                { label: 'Employee ID', value: employee.id.slice(0, 12).toUpperCase() },
                                { label: 'Gender', value: employee.gender || 'Not Specified' },
                                { label: 'Date of Birth', value: employee.dob ? new Date(employee.dob).toLocaleDateString() : 'Classified' },
                                { label: 'Residential Address', value: employee.address || 'Confidential' },
                                { label: 'Country of Origin', value: employee.countryOfOrigin || 'Unspecified' },
                                { label: 'Nationality', value: employee.nationality || 'Unspecified' },
                                { label: 'Marital Status', value: employee.maritalStatus || 'Unspecified' },
                                { label: 'National ID', value: employee.nationalId || 'None' }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--bg-card)]/50 border border-[var(--border-subtle)]">
                                    <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{item.label}</span>
                                    <span className="text-[11px] font-bold text-[var(--text-secondary)] text-right max-w-[55%] truncate">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Leave Breakdown */}
                    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
                        className="space-y-6"
                    >
                        {/* Leave stats */}
                        <div className="nx-card p-8 bg-[var(--bg-elevated)]/20 border border-amber-500/20 space-y-6">
                            <div className="flex items-center justify-between">
                                <SectionHeading icon={Clock} title="Leave Breakdown" />
                                {((currentUser?.rank || 0) >= 80) && (
                                    <button
                                        onClick={() => {
                                            setLeaveAdjustForm({
                                                leaveBalance: employee.leaveBalance?.toString() || '0',
                                                leaveAllowance: employee.leaveAllowance?.toString() || '24',
                                                reason: ''
                                            });
                                            setShowLeaveModal(true);
                                        }}
                                        className="px-3 py-1 rounded-lg bg-[var(--primary)] text-white text-[8px] font-black uppercase tracking-widest hover:scale-105 transition-all"
                                    >
                                        Adjust
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 rounded-2xl bg-[var(--bg-card)]/50 border border-[var(--border-subtle)] text-center space-y-1">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Allowance</p>
                                    <p className="text-2xl font-black text-[var(--text-primary)]">{leaveAllowance}</p>
                                    <p className="text-[8px] text-[var(--text-muted)]">days/yr</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-center space-y-1">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-amber-600">Remaining</p>
                                    <p className="text-2xl font-black text-amber-500">{leaveBalance}</p>
                                    <p className="text-[8px] text-amber-600/60">available</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-[var(--bg-card)]/50 border border-[var(--border-subtle)] text-center space-y-1">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Consumed</p>
                                    <p className="text-2xl font-black text-[var(--text-primary)]">{leaveConsumed}</p>
                                    <p className="text-[8px] text-[var(--text-muted)]">utilized</p>
                                </div>
                            </div>

                            {/* Progress bars */}
                            <div className="space-y-4">
                                {[
                                    { label: 'Leave Used', pct: leaveUsedPct, color: 'bg-amber-500', textColor: 'text-amber-500' },
                                    { label: 'Performance', pct: performanceScore, color: 'bg-[var(--primary)]', textColor: 'text-[var(--primary)]' },
                                    { label: 'Attendance', pct: 98, color: 'bg-emerald-500', textColor: 'text-emerald-500' },
                                ].map((bar, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                            <span>{bar.label}</span>
                                            <span className={bar.textColor}>{bar.pct}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-[var(--bg-card)] rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${bar.pct}%` }}
                                                transition={{ duration: 0.9, delay: 0.3 + i * 0.1 }}
                                                className={cn("h-full rounded-full shadow-sm", bar.color)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Employment Info */}
                        <div className="nx-card p-8 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-[var(--text-inverse)] border-transparent relative overflow-hidden">
                            <Activity className="absolute -bottom-6 -right-6 text-white/10" size={100} />
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-6 text-[var(--text-inverse)]/60">Employment Info</p>
                            <div className="space-y-5 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 flex-shrink-0">
                                        <Shield size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-inverse)]/50">Contract Type</p>
                                        <p className="text-sm font-black">{employee.employmentType || 'Standard'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 flex-shrink-0">
                                        <Zap size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-inverse)]/50">Salary</p>
                                        <p className="text-sm font-black italic">{employee.currency} {Number(employee.salary || 0).toLocaleString()}/yr</p>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-white/10 space-y-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-inverse)]/50">Bank Details</p>
                                    <p className="text-[11px] font-bold">{employee.bankName || 'Awaiting Details'}</p>
                                    <p className="text-[11px] opacity-70 break-all">{employee.bankAccountNumber || 'No Account Number'} ({employee.bankBranch || '?'})</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* ── Reporting Hierarchy ── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="nx-card p-8 bg-[var(--bg-elevated)]/20 border border-[var(--border-subtle)] space-y-6"
                >
                    <SectionHeading icon={Users} title="Reporting Hierarchy" />
                    {employee.supervisorObj ? (
                        <div
                            className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-card)]/50 border border-[var(--border-subtle)] group hover:border-[var(--primary)]/30 transition-all cursor-pointer max-w-sm"
                            onClick={() => navigate(`/employees/${employee.supervisorObj.id}`)}
                        >
                            {employee.supervisorObj.avatarUrl ? (
                                <img src={employee.supervisorObj.avatarUrl} alt={employee.supervisorObj.fullName} className="w-12 h-12 rounded-xl object-cover ring-2 ring-[var(--border-subtle)]/30" />
                            ) : (
                                <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-black">{employee.supervisorObj.fullName[0]}</div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-[var(--text-primary)] truncate">{employee.supervisorObj.fullName}</p>
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-0.5">Primary Manager</p>
                            </div>
                            <ChevronRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    ) : (
                        <div className="p-4 rounded-2xl bg-[var(--bg-card)]/50 border border-[var(--border-subtle)] max-w-sm">
                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">No Manager Assigned</p>
                        </div>
                    )}
                </motion.div>

                {/* ── Disciplinary Records (self-view only) ── */}
                {isOwnProfile && myDisciplinaryCases.length > 0 && (
                    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="space-y-6">
                        <SectionHeading icon={AlertOctagon} title="Disciplinary Records" />
                        <div className="space-y-4">
                            {myDisciplinaryCases.map((c: any) => (
                                <div key={c.id} className={cn(
                                    "nx-card p-6 border space-y-4",
                                    c.status === 'CLOSED' ? "border-[var(--border-subtle)] bg-[var(--bg-elevated)]/20" : "border-amber-500/20 bg-amber-500/[0.03]"
                                )}>
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-600 border border-amber-500/20">{c.type?.replace(/_/g, ' ')}</span>
                                                <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-subtle)]">{c.status}</span>
                                                {c.acknowledgedAt && <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1"><CheckCheck size={10} /> Acknowledged</span>}
                                            </div>
                                            <p className="text-[13px] font-bold text-[var(--text-primary)] mt-2">{c.reason}</p>
                                            {c.details && <p className="text-[11px] text-[var(--text-muted)] mt-1">{c.details}</p>}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle)]/50">
                                        <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                            <span>Issued by {c.issuedBy?.fullName || 'HR'}</span>
                                            <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                                            {c.hearingDate && <span className="text-amber-600">Hearing: {new Date(c.hearingDate).toLocaleDateString()}</span>}
                                        </div>
                                        {!c.acknowledgedAt && (
                                            <button
                                                onClick={() => handleAcknowledgeCase(c.id)}
                                                disabled={acknowledgingCaseId === c.id}
                                                className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-[9px] font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-1.5"
                                            >
                                                {acknowledgingCaseId === c.id ? <RefreshCw size={11} className="animate-spin" /> : <CheckCheck size={11} />}
                                                Acknowledge
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.section>
                )}

                {/* ── Performance ── */}
                <section ref={performanceRef} className="space-y-6">
                    <SectionHeading icon={Target} title="Performance" />

                    {/* Appraisal History */}
                    <div className="nx-card p-8 bg-[var(--bg-elevated)]/20 border border-[var(--border-subtle)] space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] flex items-center gap-2">
                            <Activity size={13} /> Appraisal History
                        </h3>
                        <div className="space-y-4">
                            {employee.appraisalPackets?.length > 0 ? (
                                employee.appraisalPackets.filter((p: any) => p.status !== 'CANCELLED').map((packet: any) => {
                                    const managerReview = packet.reviews?.find((r: any) => r.reviewStage === 'MANAGER_REVIEW' || r.reviewStage === 'SUPERVISOR');
                                    const score = packet.finalScore ?? managerReview?.overallRating;
                                    return (
                                        <div key={packet.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl bg-[var(--bg-card)]/50 border border-[var(--border-subtle)] group hover:border-[var(--primary)]/30 transition-all">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)] opacity-80">{packet.cycle?.title || 'Annual Review'}</p>
                                                <h4 className="text-sm font-bold text-[var(--text-primary)]">{packet.cycle?.period || 'N/A'} Evaluation Cycle</h4>
                                                <p className="text-[10px] text-[var(--text-muted)] font-medium italic">
                                                    {packet.status === 'COMPLETED' ? 'Finalized Record' : 'In Progress'}
                                                    {packet.finalScore != null && ' • Arbitrated'}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-8 mt-4 md:mt-0">
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">
                                                        {packet.finalScore != null ? 'Arbitrated Rating' : 'Final Rating'}
                                                    </p>
                                                    <p className={cn("text-xl font-black", score && score >= 80 ? "text-emerald-500" : score && score >= 60 ? "text-amber-500" : "text-rose-500")}>
                                                        {score !== null && score !== undefined ? `${score}%` : 'Pending'}
                                                    </p>
                                                </div>
                                                <button onClick={() => navigate(`/performance/packet/${packet.id}`)} className="h-10 px-6 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--primary)] transition-all">
                                                    View
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-10 text-center border border-dashed border-[var(--border-subtle)] rounded-3xl opacity-60 italic text-sm">
                                    No appraisal cycles found for this employee.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Strategic Targets */}
                    <div className="nx-card p-8 bg-[var(--bg-elevated)]/20 border border-[var(--border-subtle)] space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] flex items-center gap-2">
                            <Zap size={13} /> Strategic Goals & Targets
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {employee.targetsAssignedToMe?.length > 0 ? (
                                employee.targetsAssignedToMe.map((target: any) => (
                                    <div key={target.id} className="p-6 rounded-2xl bg-[var(--bg-card)]/50 border border-[var(--border-subtle)] space-y-4">
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="space-y-1 min-w-0">
                                                <h4 className="text-sm font-black text-[var(--text-primary)] leading-tight truncate">{target.title}</h4>
                                                <p className="text-[10px] text-[var(--text-muted)] font-medium line-clamp-1">{target.description || 'No description provided'}</p>
                                            </div>
                                            <span className={cn("px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border flex-shrink-0",
                                                target.status === 'COMPLETED' ? "border-emerald-500/20 text-emerald-500 bg-emerald-500/5" : "border-[var(--primary)]/20 text-[var(--primary)] bg-[var(--primary)]/5")}>
                                                {t(`targets.status.${target.status}`)}
                                            </span>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                                <span>Completion</span>
                                                <span>{Math.round(target.progress || 0)}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                                                <motion.div initial={{ width: 0 }} animate={{ width: `${target.progress || 0}%` }} className="h-full bg-[var(--primary)] rounded-full" />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full p-10 text-center border border-dashed border-[var(--border-subtle)] rounded-3xl opacity-60 italic text-sm">
                                    No active or historical targets assigned.
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* ── Document Vault ── */}
                <section ref={documentsRef} className="space-y-6">
                    <SectionHeading icon={FileText} title="Document Vault" />
                    <div className="nx-card p-8 bg-[var(--bg-elevated)]/20 border border-[var(--border-subtle)]">
                        <DocumentVault employeeId={id!} isAdmin={isHRAdmin} />
                    </div>
                </section>

                {/* ── Activity & History ── */}
                <section className="space-y-6">
                    <SectionHeading icon={Activity} title="Activity & History" />
                    <HistoryLog logs={employee.historyLogs} />
                </section>

                {/* ── Onboarding & Access ── */}
                <section ref={onboardingRef} className="space-y-6">
                    <SectionHeading icon={UserPlus} title="Onboarding & Access" />

                    {/* Lifecycle Stage Banner */}
                    <div className={cn("flex flex-wrap items-center gap-4 p-5 rounded-2xl border",
                        employee.employeeLifecycleStage === 'PENDING_HR_REVIEW' ? "bg-amber-500/5 border-amber-500/20" :
                        profileLocked ? "bg-rose-500/5 border-rose-500/20" :
                        employee.employeeLifecycleStage === 'PREBOARDING' ? "bg-[var(--primary)]/5 border-[var(--primary)]/20" :
                        "bg-emerald-500/5 border-emerald-500/20"
                    )}>
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                            employee.employeeLifecycleStage === 'PENDING_HR_REVIEW' ? "bg-amber-500/10 text-amber-500" :
                            profileLocked ? "bg-rose-500/10 text-rose-500" :
                            employee.employeeLifecycleStage === 'PREBOARDING' ? "bg-[var(--primary)]/10 text-[var(--primary)]" :
                            "bg-emerald-500/10 text-emerald-500"
                        )}>
                            <UserPlus size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Profile Status</p>
                            <p className="text-base font-black text-[var(--text-primary)] mt-0.5">
                                {employee.employeeLifecycleStage === 'PENDING_HR_REVIEW' ? 'Submitted — Awaiting HR Review' :
                                 employee.employeeLifecycleStage === 'PREBOARDING' ? 'Invite Active — Awaiting Employee' :
                                 employee.employeeLifecycleStage === 'ONBOARDING' ? 'Onboarding In Progress' :
                                 profileLocked ? 'Profile Locked — Self-Service Disabled' :
                                 'Active'}
                            </p>
                        </div>
                        {employee.employeeLifecycleStage === 'PENDING_HR_REVIEW' && isHRAdmin && (
                            <button onClick={async () => {
                                try {
                                    await api.post(`/employees/${employee.id}/hr-review-approve`);
                                    toast.success('Account activated — employee can now log in');
                                    fetchEmployee();
                                } catch (err: any) { toast.error(err?.response?.data?.error || 'Approval failed'); }
                            }} className="px-5 py-2 rounded-xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all shadow-lg">
                                Approve & Activate
                            </button>
                        )}
                    </div>

                    {/* HR Admin: Link Control Panel */}
                    {isHRAdmin && (
                        <div className="nx-card p-6 bg-[var(--bg-elevated)]/20 border border-[var(--border-subtle)] space-y-5">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div>
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)] flex items-center gap-2">
                                        <Link2 size={14} className="text-[var(--primary)]" /> Profile Access Control
                                    </h3>
                                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                                        {linkIsActive
                                            ? 'Link is ON — employee can fill or update their personal details.'
                                            : 'Link is OFF — employee profile is locked. Only HR can make changes.'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleToggleInvite(!linkIsActive)}
                                    className={cn(
                                        "flex items-center gap-3 px-5 py-2.5 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all shadow-sm",
                                        linkIsActive
                                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-600"
                                            : "bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)] hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-600"
                                    )}
                                >
                                    <span className={cn("w-8 h-4.5 rounded-full flex items-center px-0.5 transition-colors", linkIsActive ? "bg-emerald-500" : "bg-[var(--text-muted)]/30")}>
                                        <span className={cn("w-3.5 h-3.5 rounded-full bg-white shadow transition-transform", linkIsActive ? "translate-x-3.5" : "translate-x-0")} />
                                    </span>
                                    {linkIsActive ? 'Link ON — Click to Disable' : 'Link OFF — Click to Enable'}
                                </button>
                            </div>

                            {loadingInvite ? (
                                <div className="h-14 flex items-center justify-center opacity-40"><RefreshCw size={16} className="animate-spin" /></div>
                            ) : linkIsActive && inviteData?.inviteUrl ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)]">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Invite URL — paste into email or WhatsApp</p>
                                            <p className="text-[11px] text-[var(--text-secondary)] font-mono truncate" title={inviteData.inviteUrl}>{inviteData.inviteUrl}</p>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(inviteData.inviteUrl, 'invite-url')}
                                            className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-[var(--primary)]/20"
                                        >
                                            {copiedField === 'invite-url' ? <CheckCheck size={13} /> : <Copy size={13} />}
                                            {copiedField === 'invite-url' ? 'Copied!' : 'Copy Link'}
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold">
                                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">● Active</span>
                                        {inviteData.expiresAt && (
                                            <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                                                <Clock size={11} /> Expires {new Date(inviteData.expiresAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        )}
                                        <button onClick={handleRegenerateInvite} disabled={regeneratingInvite} className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--primary)] transition-all disabled:opacity-50">
                                            <RefreshCw size={11} className={regeneratingInvite ? 'animate-spin' : ''} /> Regenerate
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-elevated)]/40 px-4 py-3 rounded-xl border border-[var(--border-subtle)]">
                                        <strong className="text-[var(--text-secondary)]">Tip:</strong> Copy the link and send it to <strong className="text-[var(--primary)]">{employee.fullName}</strong> via email or WhatsApp. They open it without logging in, fill their details, and HR gets notified.
                                    </p>
                                </div>
                            ) : inviteData?.usedAt ? (
                                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3 text-[11px] text-emerald-600">
                                    <CheckCheck size={16} />
                                    <span>Profile completed by employee on <strong>{new Date(inviteData.usedAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</strong>. Link is now off — profile is locked.</span>
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)] flex items-center gap-3">
                                    <Lock size={14} className="text-[var(--text-muted)] flex-shrink-0" />
                                    <p className="text-[11px] text-[var(--text-muted)]">Profile is locked. Toggle the switch above to generate a new invite link and allow the employee to update their information.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Employee view: profile locked notice */}
                    {isOwnProfile && profileLocked && (
                        <div className="nx-card p-6 bg-[var(--bg-elevated)]/20 border border-rose-500/20 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center flex-shrink-0">
                                    <Lock size={18} />
                                </div>
                                <div>
                                    <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-primary)]">Profile Locked</h3>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">Your personal details are locked for data integrity.</p>
                                </div>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-elevated)]/40 p-4 rounded-xl border border-[var(--border-subtle)] leading-relaxed">
                                If you need to update any personal details (e.g., change of bank, new address), raise a formal request with HR. HR will unlock your profile, allow you to make changes, then lock it again.
                            </p>
                            <button
                                onClick={() => navigate('/support?queue=HR&subject=Profile+Update+Request')}
                                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg"
                            >
                                <Send size={13} /> Raise Profile Update Request
                            </button>
                        </div>
                    )}

                    {/* Employee view: profile open for editing */}
                    {isOwnProfile && linkIsActive && (
                        <div className="p-4 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/20 flex items-center gap-3">
                            <CheckCheck size={15} className="text-[var(--primary)] flex-shrink-0" />
                            <p className="text-[11px] text-[var(--primary)] font-semibold">Your profile is currently open for updates. Use the invite link sent to your email to complete or update your personal information.</p>
                        </div>
                    )}
                </section>

                {/* ── Digital Call Card (own profile + org setting enabled) ── */}
                {settings?.allowCallCard && currentUser?.id === employee.id && (
                    <section className="space-y-6">
                        <SectionHeading icon={Globe} title="Digital Call Card & Leads" />
                        <div className={cn("grid grid-cols-1 gap-10", userCard?.enableContactCollection ? "lg:grid-cols-3" : "max-w-xl")}>
                            {/* Card Visual */}
                            <div className="space-y-8">
                                <div className="nx-card p-8 bg-[var(--bg-elevated)]/20 border border-[var(--border-subtle)] space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)]">Card Visual Identity</h3>
                                        {userCard ? (
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase border",
                                                userCard.isActive
                                                    ? (employee.isOnLeave ? "bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600")
                                                    : "bg-rose-500/10 border-rose-500/20 text-rose-600"
                                            )}>
                                                {userCard.isActive ? (employee.isOnLeave ? "Out of Office" : "Active") : "Suspended"}
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 rounded-full bg-gray-500/10 border border-gray-500/20 text-gray-500 text-[8px] font-black tracking-widest uppercase">Not Created</span>
                                        )}
                                    </div>

                                    {userCard ? (() => {
                                        const primaryCol = settings?.primaryColor || '#009EE3';
                                        const accentCol = settings?.accentColor || '#EE7100';
                                        const logoSrc = settings?.logoUrl || settings?.companyLogoUrl || '';
                                        return (
                                            <div className="space-y-6">
                                                <div className="relative w-full h-[230px] [perspective:1000px] cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
                                                    <div className={cn("w-full h-full relative transition-transform duration-700 [transform-style:preserve-3d]", isFlipped ? "[transform:rotateY(180deg)]" : "")}>
                                                        {/* Front */}
                                                        <div className="absolute inset-0 w-full h-full rounded-[24px] bg-white border border-zinc-200/60 p-6 shadow-xl [backface-visibility:hidden] flex flex-col justify-between overflow-hidden">
                                                            <svg className="absolute bottom-0 right-0 left-0 w-full h-[70px] overflow-hidden pointer-events-none" viewBox="0 0 500 150" preserveAspectRatio="none">
                                                                <path d="M0,80 C150,170 350,20 500,80 L500,150 L0,150 Z" fill={primaryCol} opacity="0.15"></path>
                                                                <path d="M0,100 C150,180 350,50 500,120 L500,150 L0,150 Z" fill={primaryCol} opacity="0.85"></path>
                                                                <path d="M0,120 C180,180 320,100 500,140 L500,150 L0,150 Z" fill={accentCol} opacity="0.75"></path>
                                                            </svg>
                                                            <div className="flex justify-between items-start z-10">
                                                                <span className="px-2.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest bg-zinc-100 border border-zinc-200 text-zinc-600">Active Member</span>
                                                                {logoSrc ? (
                                                                    <img src={logoSrc} alt="Company Logo" className="h-6 max-w-[90px] object-contain" />
                                                                ) : (
                                                                    <div className="text-right">
                                                                        <h4 className="text-[11px] font-black tracking-widest uppercase text-zinc-800">MCB</h4>
                                                                        <p className="text-[5px] font-black uppercase text-zinc-400">Ghana</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-4 z-10 mt-2">
                                                                <div className="w-16 h-16 rounded-2xl flex-shrink-0 bg-zinc-50 border p-1 shadow-sm overflow-hidden" style={{ borderColor: accentCol }}>
                                                                    <img src={getSafeAvatarUrl(employee.avatarUrl, employee.fullName)} alt={userCard.fullName} className="w-full h-full object-cover rounded-xl" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <h4 className="font-black text-[14px] uppercase truncate tracking-wide text-zinc-900">{userCard.fullName}</h4>
                                                                    <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: accentCol }}>{userCard.jobTitle}</p>
                                                                    {userCard.department && <p className="text-[8px] text-zinc-500 font-bold uppercase">{userCard.department}</p>}
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between items-center z-10 border-t border-zinc-100 pt-2 text-[8px] font-bold text-zinc-500 mt-2">
                                                                <div className="truncate flex items-center gap-1.5 max-w-[48%]">
                                                                    <Mail size={10} style={{ color: primaryCol }} />
                                                                    <span className="truncate">{userCard.email}</span>
                                                                </div>
                                                                <div className="truncate flex items-center gap-1.5 max-w-[48%]">
                                                                    <Phone size={10} style={{ color: primaryCol }} />
                                                                    <span className="truncate">{userCard.phone || "No Phone"}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {/* Back */}
                                                        <div className="absolute inset-0 w-full h-full rounded-[24px] border p-6 shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col items-center justify-between overflow-hidden"
                                                            style={{ backgroundColor: primaryCol, borderColor: primaryCol + "30" }}>
                                                            <svg className="absolute bottom-0 right-0 left-0 w-full h-[60px] overflow-hidden pointer-events-none" viewBox="0 0 500 150" preserveAspectRatio="none">
                                                                <path d="M0,100 C150,180 350,50 500,120 L500,150 L0,150 Z" fill={accentCol} opacity="0.25"></path>
                                                                <path d="M0,120 C180,180 320,100 500,140 L500,150 L0,150 Z" fill={accentCol} opacity="0.45"></path>
                                                            </svg>
                                                            <div className="flex justify-between items-center w-full z-10">
                                                                <div className="flex items-center gap-1">
                                                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                                                                    <span className="text-[6px] uppercase font-black tracking-widest text-white/80">NFC Contactless</span>
                                                                </div>
                                                                {logoSrc ? (
                                                                    <img src={logoSrc} alt="Company Logo" className="h-5 max-w-[80px] object-contain brightness-0 invert" />
                                                                ) : (
                                                                    <h4 className="text-[10px] font-black tracking-widest uppercase text-white">MCB</h4>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col items-center justify-center my-auto space-y-2 z-10">
                                                                <div className="p-2 bg-white rounded-2xl shadow-inner flex items-center justify-center border border-white/20">
                                                                    <QRCodeCanvas
                                                                        id={"qr-canvas-profile-" + userCard.id}
                                                                        value={window.location.origin + "/shared-card/" + userCard.id}
                                                                        size={75} level="H" includeMargin={true}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="z-10 text-[7px] font-black tracking-widest uppercase text-white/80 pb-1 flex items-center gap-1.5">
                                                                <QrCode size={10} style={{ color: accentCol }} /> Scan to Connect & Save
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Hidden hi-res QR for download */}
                                                <div style={{ display: 'none' }}>
                                                    <QRCodeCanvas id={`qr-canvas-profile-hidden-${userCard.id}`} value={`${window.location.origin}/shared-card/${userCard.id}`} size={256} level="H" includeMargin={true} />
                                                </div>

                                                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }} className="hover:text-[var(--primary)] transition-all flex items-center gap-1.5">
                                                        🔄 Tap to Flip Card
                                                    </button>
                                                    <button type="button" onClick={(e) => {
                                                        e.stopPropagation();
                                                        const canvas = document.getElementById(`qr-canvas-profile-hidden-${userCard.id}`) as HTMLCanvasElement;
                                                        if (canvas) {
                                                            const link = document.createElement('a');
                                                            link.download = `MCB-Card-QR-${userCard.fullName.replace(/\s+/g, '-')}.png`;
                                                            link.href = canvas.toDataURL();
                                                            link.click();
                                                            toast.success("Crisp high-resolution QR downloaded!");
                                                        } else {
                                                            toast.error("Could not generate download file.");
                                                        }
                                                    }} className="hover:text-[var(--primary)] transition-all flex items-center gap-1.5">
                                                        📥 Save QR Code
                                                    </button>
                                                </div>

                                                <div className="p-4 rounded-2xl bg-[var(--bg-card)]/50 border border-[var(--border-subtle)] space-y-4">
                                                    <h4 className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Physical NFC Programming</h4>
                                                    <p className="text-[10px] leading-relaxed text-[var(--text-secondary)] font-medium">
                                                        Have a blank physical NFC business card or tag? You can directly program it using your phone or web browser!
                                                    </p>
                                                    <button type="button" onClick={handleWriteNFC} disabled={nfcWriting}
                                                        className={cn("w-full py-3 rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border transition-all",
                                                            nfcSuccess ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-[var(--primary)] text-white border-transparent hover:opacity-90"
                                                        )}
                                                    >
                                                        <Globe size={12} className={nfcWriting ? "animate-spin" : ""} />
                                                        {nfcWriting ? 'Align tag to writer...' : (nfcSuccess ? 'Tag Programmed!' : 'Program Physical NFC')}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })() : (
                                        <div className="p-10 border border-dashed border-[var(--border-subtle)] rounded-3xl text-center space-y-4">
                                            <p className="text-xs text-[var(--text-muted)] font-medium italic">
                                                Marketing has not published your digital call card yet. Submit a request to the Marketing help-desk queue if your details need to be created or corrected.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Analytics & Connection log */}
                            {userCard?.enableContactCollection && (
                                <div className="lg:col-span-2 space-y-8">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="nx-card p-6 bg-[var(--bg-elevated)]/20 border border-[var(--border-subtle)] space-y-2 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-2 opacity-5 text-[var(--primary)]"><Globe size={32} /></div>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Card Impressions</p>
                                            <p className="text-3xl font-black text-[var(--text-primary)]">{connectionData.views} <span className="text-[10px] text-[var(--text-muted)] tracking-normal uppercase">Scans</span></p>
                                        </div>
                                        <div className="nx-card p-6 bg-[var(--bg-elevated)]/20 border border-[var(--border-subtle)] space-y-2 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-2 opacity-5 text-emerald-500"><UserCheck size={32} /></div>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Connections Captured</p>
                                            <p className="text-3xl font-black text-emerald-500">{connectionData.connections.length} <span className="text-[10px] text-emerald-500/60 tracking-normal uppercase">Leads</span></p>
                                        </div>
                                    </div>

                                    <div className="nx-card p-8 bg-[var(--bg-elevated)]/20 border border-[var(--border-subtle)] space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)]">Connection Exchange Log</h3>
                                            {connectionData.connections.length > 0 && (
                                                <button onClick={handleExportCSV} className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-[8px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all flex items-center gap-2">
                                                    <Download size={12} /> Export CSV
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-4">
                                            {connectionData.connections.length > 0 ? (
                                                connectionData.connections.map((c) => (
                                                    <div key={c.id} className="p-6 rounded-2xl bg-[var(--bg-card)]/50 border border-[var(--border-subtle)] hover:border-[var(--primary)]/20 transition-all space-y-4">
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                            <div className="space-y-1">
                                                                <h4 className="text-sm font-black text-[var(--text-primary)] leading-none uppercase">{c.fullName}</h4>
                                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[var(--text-muted)] font-semibold">
                                                                    {c.company && <span>🏢 {c.company}</span>}
                                                                    {c.company && <span>•</span>}
                                                                    <span>📅 {new Date(c.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <a href={'mailto:' + c.email} className="px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--primary)]/30 transition-all flex items-center gap-1.5">
                                                                    <Mail size={12} /> Email
                                                                </a>
                                                                {c.phone && (
                                                                    <a href={'tel:' + c.phone} className="px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--primary)]/30 transition-all flex items-center gap-1.5">
                                                                        <Phone size={12} /> Call
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {c.notes && (
                                                            <p className="text-[10px] leading-relaxed text-[var(--text-secondary)] italic bg-[var(--bg-elevated)]/30 p-3.5 rounded-xl border border-[var(--border-subtle)]/50">"{c.notes}"</p>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-10 border border-dashed border-[var(--border-subtle)] rounded-3xl text-center opacity-60 italic text-sm">
                                                    No connections captured yet. Share your digital QR code or NFC tag to receive professional leads!
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}
            </div>

            {/* ─────────────────────────────────────────────
                MODALS
            ───────────────────────────────────────────── */}

            {/* Reset Password Modal */}
            <AnimatePresence>
                {showResetModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[2.5rem] p-10 shadow-2xl"
                        >
                            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500 mx-auto mb-6">
                                <Lock size={28} />
                            </div>
                            <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight text-center mb-2">Reset Password</h2>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center mb-8">Send a secure reset link to <span className="text-[var(--primary)]">{employee.fullName}</span></p>
                            <div className="space-y-6">
                                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-main)] p-5">
                                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">The employee will receive a one-time link valid for one hour. Administrators never see or set the employee's password. Sending the link revokes active sessions.</p>
                                </div>
                                <div className="flex flex-col gap-3 pt-4">
                                    <button onClick={handleResetPassword} disabled={resetting} className="btn-primary w-full py-4 text-xs font-black uppercase tracking-[0.2em] shadow-xl disabled:opacity-50">
                                        {resetting ? 'Sending Link...' : 'Send Secure Reset Link'}
                                    </button>
                                    <button onClick={() => setShowResetModal(false)} className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">Cancel</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Leave Adjustment Modal */}
            <AnimatePresence>
                {showLeaveModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[2.5rem] p-10 shadow-2xl"
                        >
                            <div className="w-16 h-16 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-2xl flex items-center justify-center text-[var(--primary)] mx-auto mb-6">
                                <Zap size={28} />
                            </div>
                            <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight text-center mb-2">Leave Allowance Adjustment</h2>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center mb-8">Manual balance update for <span className="text-[var(--primary)]">{employee.fullName}</span></p>
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Annual Allowance</label>
                                        <input type="number" value={leaveAdjustForm.leaveAllowance} onChange={(e) => setLeaveAdjustForm({...leaveAdjustForm, leaveAllowance: e.target.value})} className="nx-input" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Current Balance</label>
                                        <input type="number" value={leaveAdjustForm.leaveBalance} onChange={(e) => setLeaveAdjustForm({...leaveAdjustForm, leaveBalance: e.target.value})} className="nx-input" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Adjustment Rationale (Audit)</label>
                                    <textarea value={leaveAdjustForm.reason} onChange={(e) => setLeaveAdjustForm({...leaveAdjustForm, reason: e.target.value})} placeholder="Explain why this adjustment is being made..." className="nx-input min-h-[100px] text-sm" />
                                </div>
                                <div className="flex flex-col gap-3 pt-4">
                                    <button onClick={handleAdjustLeave} disabled={adjustingLeave} className="btn-primary w-full py-4 text-xs font-black uppercase tracking-[0.2em] shadow-xl disabled:opacity-50">
                                        {adjustingLeave ? 'Updating...' : 'Update Balance'}
                                    </button>
                                    <button onClick={() => setShowLeaveModal(false)} className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">Cancel</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Promotion Request Modal */}
            <AnimatePresence>
                {showPromotionModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[2.5rem] p-10 shadow-2xl"
                        >
                            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-500 mx-auto mb-6">
                                <Zap size={28} />
                            </div>
                            <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight text-center mb-2">Promotion Suggestion</h2>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center mb-8">Recommend <span className="text-[var(--primary)]">{employee.fullName}</span> for advancement</p>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Target Role</label>
                                    <select value={promotionForm.targetRole} onChange={(e) => setPromotionForm({...promotionForm, targetRole: e.target.value})} className="nx-input">
                                        {Object.keys(t('employees.roles', { returnObjects: true })).map((role) => (
                                            <option key={role} value={role}>{t(`employees.roles.${role}`)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Target Job Title</label>
                                    <input type="text" value={promotionForm.targetJobTitle} onChange={(e) => setPromotionForm({...promotionForm, targetJobTitle: e.target.value})} className="nx-input" placeholder="e.g. Senior Software Engineer" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Proposed Salary (Annual)</label>
                                    <input type="number" value={promotionForm.proposedSalary} onChange={(e) => setPromotionForm({...promotionForm, proposedSalary: e.target.value})} className="nx-input" placeholder="GHS" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Rationale / Reason</label>
                                    <textarea value={promotionForm.reason} onChange={(e) => setPromotionForm({...promotionForm, reason: e.target.value})} placeholder="Explain why this employee deserves a promotion..." className="nx-input min-h-[100px] text-sm" />
                                </div>
                                <div className="flex flex-col gap-3 pt-4">
                                    <button onClick={handlePromotionSubmit} disabled={submittingPromotion} className="btn-primary bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20 w-full py-4 text-xs font-black uppercase tracking-[0.2em] shadow-xl disabled:opacity-50">
                                        {submittingPromotion ? 'Submitting...' : 'Submit Suggestion'}
                                    </button>
                                    <button onClick={() => setShowPromotionModal(false)} className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">Cancel</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default EmployeeProfile;
