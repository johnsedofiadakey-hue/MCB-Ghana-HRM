import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Mail, Phone, Briefcase, Calendar, 
  Shield, Edit2, ChevronLeft, Download, FileText,
  Activity, Target, Zap, Building, Key, Lock, ShieldCheck, Globe, Clock, Umbrella,
  UserCheck, Award
} from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { getStoredUser, getRoleRankValue } from '../utils/session';
import { toast } from '../utils/toast';
import { useTranslation } from 'react-i18next';
import { useAI } from '../context/AIContext';
import { getSafeAvatarUrl } from '../utils/avatar';
import HistoryLog from '../components/profile/HistoryLog';
import EmployeePrintDossier from '../components/profile/EmployeePrintDossier';
import EmployeeIDCard from '../components/profile/EmployeeIDCard';
import { QRCodeCanvas } from 'qrcode.react';

// Design Theme Configs matching ITAdmin card themes exactly
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

const EmployeeProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [employee, setEmployee] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'documents' | 'history' | 'onboarding' | 'call-card'>('overview');
    const [kpiSummary, setKpiSummary] = useState<any>(null);

    // Call card connections state fields
    const [connectionData, setConnectionData] = useState<{ views: number; connections: any[] }>({ views: 0, connections: [] });
    const [userCard, setUserCard] = useState<any>(null);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loadingConnections, setLoadingConnections] = useState(false);
    const [nfcWriting, setNfcWriting] = useState(false);
    const [nfcSuccess, setNfcSuccess] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [resetting, setResetting] = useState(false);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [leaveAdjustForm, setLeaveAdjustForm] = useState({ leaveBalance: '', leaveAllowance: '', reason: '' });
    const [adjustingLeave, setAdjustingLeave] = useState(false);
    const [riskProfile, setRiskProfile] = useState<any>(null);
    const [printType, setPrintType] = useState<'dossier' | 'idcard' | null>(null);
    const [showPromotionModal, setShowPromotionModal] = useState(false);
    const [submittingPromotion, setSubmittingPromotion] = useState(false);
    const [promotionForm, setPromotionForm] = useState({
        targetRole: 'STAFF',
        targetJobTitle: '',
        proposedSalary: '',
        reason: ''
    });
    const { t } = useTranslation();
    const { setContextData } = useAI();

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
            
            // Default promotion job title
            setPromotionForm(prev => ({ ...prev, targetJobTitle: empRes.data.jobTitle }));
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

    const handleWriteNFC = async () => {
        if (!userCard?.id) {
            toast.error("Please configure your Digital Call Card before writing to NFC.");
            return;
        }
        
        const publicUrl = `${window.location.origin}/shared-card/${userCard.id}`;
        
        if (!('NDEFReader' in window)) {
            toast.error("Web NFC is not supported by your current browser or device. Please use Chrome on Android or a supported client.");
            return;
        }

        try {
            setNfcWriting(true);
            const ndef = new (window as any).NDEFReader();
            await ndef.write({
                records: [
                    {
                        recordType: "url",
                        data: publicUrl
                    }
                ]
            });
            setNfcSuccess(true);
            toast.success("Successfully programmed Call Card URL to physical NFC tag!");
            setTimeout(() => setNfcSuccess(false), 5000);
        } catch (err: any) {
            console.error("[WebNFC] Programming failed:", err);
            toast.error(`NFC Programming failed: ${err.message || 'Verification timed out or tag removed too quickly.'}`);
        } finally {
            setNfcWriting(false);
        }
    };

    const handleExportCSV = () => {
        if (!connectionData.connections.length) {
            toast.error("No connections to export.");
            return;
        }

        const headers = ["Full Name", "Email Address", "Phone Number", "Company", "Notes", "Exchanged Date"];
        const rows = connectionData.connections.map(c => [
            c.fullName,
            c.email,
            c.phone || "",
            c.company || "",
            c.notes || "",
            new Date(c.createdAt).toLocaleString()
        ]);

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `MCB_Ghana_Connections_${employee.fullName.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Connection log exported successfully as CSV!");
    };

    useEffect(() => {
        if (employee) {
            setContextData({ ...employee, kpiSummary });
        }
        return () => setContextData(null);
    }, [employee, kpiSummary, setContextData]);

    const handlePromotionSubmit = async () => {
        if (!promotionForm.reason || !promotionForm.targetRole) {
            toast.error('Please provide a target role and reason');
            return;
        }

        setSubmittingPromotion(true);
        try {
            await api.post('/hr/promotions', {
                employeeId: id,
                ...promotionForm
            });
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
        if (!newPassword || newPassword.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }

        setResetting(true);
        try {
            await api.post(`/employees/${id}/reset-password`, { newPassword });
            toast.success('Password successfully reset');
            setShowResetModal(false);
            setNewPassword('');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to reset password');
        } finally {
            setResetting(false);
        }
    };

    const handleAdjustLeave = async () => {
        if (!leaveAdjustForm.leaveBalance || !leaveAdjustForm.leaveAllowance || !leaveAdjustForm.reason) {
            toast.error('All fields are required');
            return;
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

    if (loading) {
        return (
            <div className="py-40 flex flex-col items-center justify-center gap-6">
                <div className="w-16 h-16 rounded-full border-4 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)]">Loading Staff Profile</p>
            </div>
        );
    }

    const StatMini = ({ icon: Icon, label, value, color }: any) => (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)]/50 overflow-hidden min-w-0">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border border-[var(--border-subtle)]", color || 'text-[var(--primary)] bg-[var(--primary)]/5')}>
                <Icon size={18} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60 truncate">{label}</p>
                <p className="text-sm font-black text-[var(--text-primary)] truncate transition-all" title={value}>{value}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-12 pb-32 print:p-0">
            {/* Main Profile UI - Hidden during print */}
            <div className="print:hidden space-y-12">
            {/* Navigation & Actions */}
            <div className="flex items-center justify-between print:hidden">
                <button onClick={() => navigate('/employees')} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-[var(--primary)] transition-all">
                    <ChevronLeft size={18} /> Back to Directory
                </button>
                <div className="flex gap-4">
                    <motion.button 
                        onClick={() => { setPrintType('dossier'); setTimeout(() => window.print(), 500); }} 
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} 
                        className="px-6 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center gap-2"
                    >
                        <Download size={14} /> Export PDF
                    </motion.button>
                    {(normalizedRole === 'IT_MANAGER' || normalizedRole === 'IT_ADMIN' || normalizedRole === 'DEV') && (
                        <motion.button 
                            onClick={() => { setPrintType('idcard'); setTimeout(() => window.print(), 500); }} 
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} 
                            className="px-6 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center gap-2"
                        >
                            <FileText size={14} /> Print ID Card
                        </motion.button>
                    )}
                    {((currentUser?.rank || 0) >= 85 || currentUser?.role === 'DEV') && currentUser?.id !== employee.id && (
                        <motion.button onClick={() => setShowResetModal(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-6 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest text-amber-600 hover:bg-amber-500 hover:text-white transition-all flex items-center gap-2">
                            <Key size={14} /> Reset Password
                        </motion.button>
                    )}
                    {(currentUser?.id === employee.supervisorId || (currentUser?.rank || 0) >= 85) && currentUser?.id !== employee.id && (
                        <motion.button onClick={() => setShowPromotionModal(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-6 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-2">
                            <Zap size={14} /> Suggest Promotion
                        </motion.button>
                    )}
                    {((currentUser?.rank || 0) >= 75 || currentUser?.role === 'DEV') && (
                        <motion.button onClick={() => setShowLeaveModal(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-6 py-3 rounded-xl bg-[var(--info)]/10 border border-[var(--info)]/20 text-[10px] font-black uppercase tracking-widest text-[var(--info)] hover:bg-[var(--info)] hover:text-white transition-all flex items-center gap-2">
                            <Umbrella size={14} /> Adjust Leave
                        </motion.button>
                    )}
                    {((currentUser?.rank || 0) >= 85 || currentUser?.id === employee.id) ? (
                        <motion.button onClick={() => navigate('/employees?edit=' + employee.id)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-8 py-3 rounded-xl bg-[var(--primary)] text-[var(--text-inverse)] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-[var(--primary)]/30 flex items-center gap-2">
                            <Edit2 size={14} /> Update Profile
                        </motion.button>
                    ) : null}
                </div>
            </div>

            {/* Profile Hero section */}
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
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = getSafeAvatarUrl(undefined, employee.fullName);
                                }}
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
                            <StatMini icon={Mail} label="Email Address" value={employee.email} color="text-orange-500 bg-orange-500/5" />
                            <StatMini icon={Phone} label="Contact Number" value={employee.contactNumber || '—'} color="text-blue-500 bg-blue-500/5" />
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

            {/* Matrix Tabs */}
            <div className="flex border-b border-[var(--border-subtle)]/30 gap-10 print:hidden overflow-x-auto custom-scrollbar">
                {([
                    'overview', 
                    'performance', 
                    'documents', 
                    'history', 
                    'onboarding',
                    ...(currentUser?.id === employee.id ? ['call-card'] : [])
                ] as const).map(t => (
                    <button key={t} onClick={() => setActiveTab(t as any)}
                        className={cn("pb-6 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative whitespace-nowrap",
                        activeTab === t ? "text-[var(--primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]")}>
                        {t === 'call-card' ? 'Call Card & Leads' : t}
                        {activeTab === t && <motion.div layoutId="profile-tab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--primary)] shadow-[0_0_10px_var(--primary)]" />}
                    </button>
                ))}
            </div>

            {/* Dashboard Content Matrix */}
            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-10"
                    >
                        <div className="lg:col-span-2 space-y-10">
                            <div className="nx-card p-8 bg-[var(--bg-elevated)]/20 border border-[var(--border-subtle)] group">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)] mb-8 flex items-center gap-3">
                                    <Target className="text-[var(--primary)]" size={16} /> Performance Summary
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">Status</p>
                                        <p className="text-[15px] font-black text-[var(--text-primary)]">Active</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">Grade</p>
                                        <p className="text-[15px] font-black text-[var(--text-primary)]">Management</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">Rank</p>
                                        <p className="text-[15px] font-black text-[var(--text-primary)] italic underline decoration-[var(--primary)]/30 underline-offset-4">{t(`employees.roles.${employee.role}`)}</p>
                                    </div>
                                </div>
                                <div className="mt-10 p-6 rounded-2xl bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] italic text-sm text-[var(--text-secondary)] leading-relaxed">
                                    "Overall performance is consistent and aligns with organizational goals."
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                 <div className="nx-card p-8 bg-[var(--bg-elevated)]/20 border-[var(--border-subtle)] space-y-6">
                                     <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)] flex items-center gap-3">
                                         <Shield className="text-[var(--primary)] opacity-60" size={14} /> Identification & Bio
                                     </h4>
                                     <div className="space-y-4">
                                         {[
                                             { label: 'Employee ID', value: employee.id.slice(0, 12).toUpperCase() },
                                             { label: 'Gender', value: employee.gender || 'Not Specified' },
                                             { label: 'Date of Birth', value: employee.dob ? new Date(employee.dob).toLocaleDateString() : 'Classified' },
                                             { label: 'Residential Address', value: employee.address || 'Confidential' },
                                             { label: 'Country of Origin', value: employee.countryOfOrigin || 'Unspecified', icon: Globe },
                                             { label: 'Nationality', value: employee.nationality || 'Unspecified', icon: Globe },
                                             { label: 'Marital Status', value: employee.maritalStatus || 'Unspecified' },
                                             { label: 'National ID', value: employee.nationalId || 'None' }
                                         ].map((item, i) => (
                                             <div key={i} className="flex flex-col gap-1 px-4 py-2.5 rounded-xl bg-[var(--bg-card)]/50 border border-[var(--border-subtle)] group/item">
                                                 <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                                                     {item.icon && <item.icon size={10} className="text-[var(--primary)]" />}
                                                     {item.label}
                                                 </span>
                                                 <span className="text-[11px] font-bold text-[var(--text-secondary)]">{item.value}</span>
                                             </div>
                                         ))}
                                     </div>
                                 </div>
                                 
                                 <div className="nx-card p-8 bg-[var(--bg-elevated)]/20 border-[var(--border-subtle)] space-y-6 group">
                                     <h4 className="text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3">
                                         <Clock size={14} className="animate-pulse" /> Live Leave Countdown
                                     </h4>
                                     <div className="space-y-8 py-4">
                                         <div className="space-y-3">
                                             <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                                 <span>Average Performance</span>
                                                 <span className="text-[var(--primary)]">{Math.round(kpiSummary?.averageScore || 0)}%</span>
                                             </div>
                                             <div className="h-2 w-full bg-[var(--bg-card)] rounded-full overflow-hidden p-0.5">
                                                 <motion.div initial={{ width: 0 }} animate={{ width: `${kpiSummary?.averageScore || 0}%` }} className="h-full bg-[var(--primary)] rounded-full shadow-[0_0_10px_var(--primary)]" />
                                             </div>
                                         </div>
                                         <div className="space-y-3">
                                             <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                                 <span>Attendance</span>
                                                 <span className="text-emerald-500">98%</span>
                                             </div>
                                             <div className="h-2 w-full bg-[var(--bg-card)] rounded-full overflow-hidden p-0.5">
                                                 <motion.div initial={{ width: 0 }} animate={{ width: '98%' }} className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                             </div>
                                         </div>
                                     </div>
                                 </div>

                                 {/* --- LEAVE MANAGEMENT --- */}
                                 {((currentUser?.rank || 0) >= 80) && (
                                     <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                          className="nx-card p-8 bg-[var(--bg-elevated)]/20 border-amber-500/20 shadow-xl shadow-amber-500/5 space-y-6 group col-span-1 md:col-span-2"
                                     >
                                         <div className="flex items-center justify-between">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)] flex items-center gap-3">
                                                <Zap className="text-amber-500" size={16} /> Leave Management
                                            </h4>
                                            <div className="flex items-center gap-3">
                                                <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[8px] font-black tracking-widest uppercase border border-amber-500/20">
                                                    Admin View
                                                </span>
                                                <button 
                                                    onClick={() => {
                                                        setLeaveAdjustForm({
                                                            leaveBalance: employee.leaveBalance?.toString() || '0',
                                                            leaveAllowance: employee.leaveAllowance?.toString() || '24',
                                                            reason: ''
                                                        });
                                                        setShowLeaveModal(true);
                                                    }}
                                                    className="px-3 py-1 rounded-lg bg-[var(--primary)] text-white text-[8px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                                                >
                                                    Adjust Balance
                                                </button>
                                            </div>
                                         </div>

                                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
                                            <div className="p-5 rounded-2xl bg-[var(--bg-card)]/50 border border-[var(--border-subtle)] space-y-2 relative overflow-hidden group/item">
                                                <div className="absolute top-0 right-0 p-2 opacity-5 text-amber-500"><Calendar size={32} /></div>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Annual Allowance</p>
                                                <p className="text-2xl font-black text-[var(--text-primary)]">{Number(employee.leaveAllowance || 24)} <span className="text-[10px] text-[var(--text-muted)] tracking-normal">Days</span></p>
                                            </div>

                                            <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2 relative overflow-hidden group/item">
                                                <div className="absolute top-0 right-0 p-2 opacity-10 text-amber-500 animate-pulse"><Clock size={32} /></div>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-amber-600">Remaining Balance</p>
                                                <p className="text-3xl font-black text-amber-500">{Number(employee.leaveBalance || 0)} <span className="text-[10px] text-amber-600/60 tracking-normal uppercase">Available</span></p>
                                            </div>

                                            <div className="p-5 rounded-2xl bg-[var(--bg-card)]/50 border border-[var(--border-subtle)] space-y-2 relative overflow-hidden group/item">
                                                <div className="absolute top-0 right-0 p-2 opacity-5 text-rose-500"><Activity size={32} /></div>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Consumed Days</p>
                                                <p className="text-2xl font-black text-[var(--text-primary)]">{Math.max(0, Number(employee.leaveAllowance || 24) - Number(employee.leaveBalance || 0))} <span className="text-[10px] text-[var(--text-muted)] tracking-normal">Utilized</span></p>
                                            </div>
                                         </div>

                                         <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center gap-4">
                                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                            <p className="text-[9px] font-bold text-[var(--text-secondary)] italic">
                                                Leave balance is based on approved requests. Manual adjustments require HR approval.
                                            </p>
                                         </div>
                                     </motion.div>
                                 )}
                            </div>
                        </div>

                        <div className="space-y-10">
                            <div className="nx-card p-8 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-[var(--text-inverse)] border-transparent relative overflow-hidden print:!text-[var(--text-primary)] print:!bg-none print:break-inside-avoid">
                                <Activity className="absolute -bottom-6 -right-6 text-white/10 print:hidden" size={120} />
                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] mb-8 relative z-10 text-[var(--text-inverse)]/60 print:text-[var(--primary)]">Employment Info</h4>
                                <div className="space-y-6 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                                            <Shield size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-inverse)]/50">Contract Type</p>
                                            <p className="text-sm font-black">{employee.employmentType || 'Standard'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                                            <Zap size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-inverse)]/50">Salary</p>
                                            <p className="text-sm font-black italic">{employee.currency} {Number(employee.salary || 0).toLocaleString()}/yr</p>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-white/10 space-y-3">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-inverse)]/50">Bank Details</p>
                                        <p className="text-[11px] font-bold">{employee.bankName || 'Awaiting Details'}</p>
                                        <p className="text-[11px] opacity-70 break-all">{employee.bankAccountNumber || 'No Account Number'} ({employee.bankBranch || '?'})</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="nx-card p-8 bg-[var(--bg-elevated)]/20 border border-[var(--border-subtle)] space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)]">Reporting Hierarchy</h4>
                                <div className="space-y-6">
                                     {employee.supervisorObj ? (
                                         <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-card)]/50 border border-[var(--border-subtle)] group hover:border-[var(--primary)]/30 transition-all cursor-pointer" onClick={() => navigate(`/employees/${employee.supervisorObj.id}`)}>
                                             {employee.supervisorObj.avatarUrl ? (
                                                 <img src={employee.supervisorObj.avatarUrl} alt={employee.supervisorObj.fullName} className="w-12 h-12 rounded-xl object-cover ring-2 ring-[var(--border-subtle)]/30" />
                                             ) : (
                                                 <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-black">{employee.supervisorObj.fullName[0]}</div>
                                             )}
                                             <div>
                                                 <p className="text-[11px] font-bold text-[var(--text-primary)]">{employee.supervisorObj.fullName}</p>
                                                 <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-0.5">Primary Manager</p>
                                             </div>
                                         </div>
                                     ) : (
                                         <div className="p-4 rounded-2xl bg-[var(--bg-card)]/50 border border-[var(--border-subtle)] text-center">
                                             <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">No Manager Assigned</p>
                                         </div>
                                     )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'performance' && (
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                        className="space-y-10"
                    >
                        {/* Appraisal History */}
                        <div className="nx-card p-8 bg-[var(--bg-elevated)]/20 border border-[var(--border-subtle)]">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)] mb-8 flex items-center gap-3">
                                <Activity className="text-[var(--primary)]" size={16} /> Appraisal History
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
                                                        View Details
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="p-10 text-center border border-dashed border-[var(--border-subtle)] rounded-3xl opacity-60 italic text-sm">
                                        No historical appraisal cycles found for this employee.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Strategic Goals & Targets */}
                        <div className="nx-card p-8 bg-[var(--bg-elevated)]/20 border border-[var(--border-subtle)]">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)] mb-8 flex items-center gap-3">
                                <Target className="text-[var(--primary)]" size={16} /> Strategic Goals & Targets
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {employee.targetsAssignedToMe?.length > 0 ? (
                                    employee.targetsAssignedToMe.map((target: any) => (
                                        <div key={target.id} className="p-6 rounded-2xl bg-[var(--bg-card)]/50 border border-[var(--border-subtle)] space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <h4 className="text-sm font-black text-[var(--text-primary)] leading-tight">{target.title}</h4>
                                                    <p className="text-[10px] text-[var(--text-muted)] font-medium line-clamp-1">{target.description || 'No description provided'}</p>
                                                </div>
                                                <span className={cn("px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border", 
                                                    target.status === 'COMPLETED' ? "border-emerald-500/20 text-emerald-500 bg-emerald-500/5" : "border-[var(--primary)]/20 text-[var(--primary)] bg-[var(--primary)]/5")}>
                                                    {t(`targets.status.${target.status}`)}
                                                </span>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                                    <span>Completion</span>
                                                    <span>{Math.round(target.progress || 0)}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                                                    <motion.div initial={{ width: 0 }} animate={{ width: `${target.progress || 0}%` }} className="h-full bg-[var(--primary)]" />
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
                    </motion.div>
                )}

                {activeTab === 'history' && (
                    <HistoryLog logs={employee.historyLogs} />
                )}

                {activeTab === 'documents' && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                        className="nx-card p-10 bg-[var(--bg-elevated)]/20 border border-[var(--border-subtle)] min-h-[400px] flex flex-col items-center justify-center text-center opacity-40 italic"
                    >
                        <FileText size={48} className="mb-6" />
                        <h4 className="text-[11px] font-black uppercase tracking-[0.3em]">Document Vault</h4>
                        <p className="text-xs mt-2 text-[var(--text-muted)] font-medium">Loading document records...</p>
                    </motion.div>
                )}

                {activeTab === 'call-card' && (
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-10"
                    >
                        {/* LEFT COLUMN: Visual Preview Card */}
                        <div className="space-y-10">
                            <div className="nx-card p-8 bg-[var(--bg-elevated)]/20 border border-[var(--border-subtle)] space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)]">
                                        Card Visual Identity
                                    </h3>
                                    {userCard ? (
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase border",
                                            userCard.isActive 
                                                ? (employee.isOnLeave ? "bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600")
                                                : "bg-rose-500/10 border-rose-500/20 text-rose-600"
                                        )}>
                                            {userCard.isActive 
                                                ? (employee.isOnLeave ? "Out of Office (On Leave)" : "Active")
                                                : "Suspended"}
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 rounded-full bg-gray-500/10 border border-gray-500/20 text-gray-500 text-[8px] font-black tracking-widest uppercase">
                                            Not Created
                                        </span>
                                    )}
                                </div>

                                {userCard ? (() => {
                                     const primaryCol = settings?.primaryColor || '#009EE3';
                                     const accentCol = settings?.accentColor || '#EE7100';
                                     const logoSrc = settings?.logoUrl || settings?.companyLogoUrl || '';
                                     const themeStyles = getThemeConfigs(userCard.theme || 'MCB_LIGHT_GOLD', primaryCol, accentCol);

                                     return (
                                        <div className="space-y-6">
                                            {/* Perspective Container for 3D flip */}
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
                                                                    MCB Professional
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
                                                                src={getSafeAvatarUrl(employee.avatarUrl, employee.fullName)} 
                                                                alt={employee.fullName} 
                                                                className="w-12 h-12 rounded-xl object-cover border-2 p-0.5 shadow-md"
                                                                style={themeStyles.styles?.avatarBorder}
                                                            />
                                                            <div className="min-w-0">
                                                                <h3 className="text-sm font-black uppercase tracking-tight truncate">{userCard.fullName}</h3>
                                                                <p className="text-[9px] font-bold opacity-80 uppercase tracking-wide truncate">{userCard.jobTitle}</p>
                                                                {userCard.department && <p className="text-[7px] font-semibold opacity-60 uppercase tracking-widest truncate">{userCard.department}</p>}
                                                            </div>
                                                        </div>

                                                        <div className="border-t border-current/10 pt-3 text-[8px] font-bold space-y-1 opacity-80">
                                                            <p className="truncate">✉ {userCard.email}</p>
                                                            {userCard.phone && <p className="truncate">☎ {userCard.phone}</p>}
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
                                                                    id={`qr-canvas-profile-${userCard.id}`}
                                                                    value={`${window.location.origin}/shared-card/${userCard.id}`}
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

                                            {/* Action controls below card */}
                                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">
                                                <button 
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsFlipped(!isFlipped);
                                                    }}
                                                    className="hover:text-[var(--primary)] transition-all flex items-center gap-1.5"
                                                >
                                                    🔄 Tap to Flip Card
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const canvas = document.getElementById(`qr-canvas-profile-${userCard.id}`) as HTMLCanvasElement;
                                                        if (canvas) {
                                                            const link = document.createElement('a');
                                                            link.download = `MCB-Card-QR-${userCard.fullName.replace(/\s+/g, '-')}.png`;
                                                            link.href = canvas.toDataURL();
                                                            link.click();
                                                            toast.success("QR Code downloaded successfully!");
                                                        } else {
                                                            toast.error("Could not generate download file.");
                                                        }
                                                    }}
                                                    className="hover:text-[var(--primary)] transition-all flex items-center gap-1.5"
                                                >
                                                    📥 Save QR Code
                                                </button>
                                            </div>

                                            {/* Physical card programming utility via Web NFC */}
                                            <div className="p-4 rounded-2xl bg-[var(--bg-card)]/50 border border-[var(--border-subtle)] space-y-4">
                                                <h4 className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                                    Physical NFC Programming
                                                </h4>
                                                <p className="text-[10px] leading-relaxed text-[var(--text-secondary)] font-medium">
                                                    Have a blank physical NFC business card or tag? You can directly program it using your phone or web browser!
                                                </p>
                                                <button 
                                                    type="button"
                                                    onClick={handleWriteNFC}
                                                    disabled={nfcWriting}
                                                    className={cn(
                                                        "w-full py-3 rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border transition-all duration-300",
                                                        nfcSuccess ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-[var(--primary)] text-white hover:scale-102"
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
                                            An IT administrator has not generated your digital call card yet. Please reach out to your IT department to activate your networking card.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Impression Analytics & Connection leads log */}
                        <div className="lg:col-span-2 space-y-10">
                            {/* Scoreboard Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="nx-card p-6 bg-[var(--bg-elevated)]/20 border border-[var(--border-subtle)] space-y-2 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-2 opacity-5 text-[var(--primary)]"><Globe size={32} /></div>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Card Impressions (Views)</p>
                                    <p className="text-3xl font-black text-[var(--text-primary)]">{connectionData.views} <span className="text-[10px] text-[var(--text-muted)] tracking-normal uppercase">Scans</span></p>
                                </div>
                                <div className="nx-card p-6 bg-[var(--bg-elevated)]/20 border border-[var(--border-subtle)] space-y-2 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-2 opacity-5 text-emerald-500"><UserCheck size={32} /></div>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Connections Captured</p>
                                    <p className="text-3xl font-black text-emerald-500">{connectionData.connections.length} <span className="text-[10px] text-emerald-500/60 tracking-normal uppercase">Leads</span></p>
                                </div>
                            </div>

                            {/* Connection Leads table log */}
                            <div className="nx-card p-8 bg-[var(--bg-elevated)]/20 border border-[var(--border-subtle)] space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)]">
                                        Connection Exchange Log
                                    </h3>
                                    {connectionData.connections.length > 0 && (
                                        <button 
                                            onClick={handleExportCSV}
                                            className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-[8px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
                                        >
                                            <Download size={12} /> Export CSV
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {connectionData.connections.length > 0 ? (
                                        connectionData.connections.map((c: any) => (
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
                                                        <a 
                                                            href={`mailto:${c.email}`}
                                                            className="px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5"
                                                        >
                                                            <Mail size={12} /> Email
                                                        </a>
                                                        {c.phone && (
                                                            <a 
                                                                href={`tel:${c.phone}`}
                                                                className="px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5"
                                                            >
                                                                <Phone size={12} /> Call
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                                {c.notes && (
                                                    <p className="text-[10px] leading-relaxed text-[var(--text-secondary)] italic bg-[var(--bg-elevated)]/30 p-3.5 rounded-xl border border-[var(--border-subtle)]/50">
                                                        "{c.notes}"
                                                    </p>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-10 border border-dashed border-[var(--border-subtle)] rounded-3xl text-center opacity-60 italic text-sm">
                                            No connections captured yet. Share your digital business QR code or NFC tag to receive professional leads!
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            </div>

            {/* Premium Print Dossier Component (Hidden in UI, Visible on Print) */}
            <div className="print:block hidden">
                {printType === 'dossier' && <EmployeePrintDossier employee={employee} />}
                {printType === 'idcard' && <EmployeeIDCard employee={employee} />}
            </div>

            {/* Reset Password Modal Overlay */}
            <AnimatePresence>
                {showResetModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[2.5rem] p-10 shadow-2xl relative"
                        >
                            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500 mx-auto mb-6">
                                <Lock size={28} />
                            </div>
                            <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight text-center mb-2">Reset Password</h2>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center mb-8">Set new password for <span className="text-[var(--primary)]">{employee.fullName}</span></p>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">New Password</label>
                                    <input 
                                        type="text"
                                        placeholder="Min 8 characters..."
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="nx-input py-4 border-[var(--border-subtle)] bg-[var(--bg-main)] focus:ring-2 focus:ring-[var(--primary)]/20 font-bold"
                                    />
                                    <p className="text-[9px] text-[var(--text-muted)] font-medium italic">* All active sessions for this account will be revoked immediately.</p>
                                </div>

                                <div className="flex flex-col gap-3 pt-4">
                                    <button 
                                        onClick={handleResetPassword}
                                        disabled={resetting || newPassword.length < 8}
                                        className="btn-primary w-full py-4 text-xs font-black uppercase tracking-[0.2em] shadow-xl disabled:opacity-50"
                                    >
                                        {resetting ? 'Resetting Password...' : 'Reset Password'}
                                    </button>
                                    <button 
                                        onClick={() => { setShowResetModal(false); setNewPassword(''); }}
                                        className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                                    >
                                        Cancel
                                    </button>
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
                            className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[2.5rem] p-10 shadow-2xl relative"
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
                                        <input 
                                            type="number"
                                            value={leaveAdjustForm.leaveAllowance}
                                            onChange={(e) => setLeaveAdjustForm({...leaveAdjustForm, leaveAllowance: e.target.value})}
                                            className="nx-input"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Current Balance</label>
                                        <input 
                                            type="number"
                                            value={leaveAdjustForm.leaveBalance}
                                            onChange={(e) => setLeaveAdjustForm({...leaveAdjustForm, leaveBalance: e.target.value})}
                                            className="nx-input"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Adjustment Rationale (Audit)</label>
                                    <textarea 
                                        value={leaveAdjustForm.reason}
                                        onChange={(e) => setLeaveAdjustForm({...leaveAdjustForm, reason: e.target.value})}
                                        placeholder="Explain why this adjustment is being made..."
                                        className="nx-input min-h-[100px] text-sm"
                                    />
                                </div>

                                <div className="flex flex-col gap-3 pt-4">
                                    <button 
                                        onClick={handleAdjustLeave}
                                        disabled={adjustingLeave}
                                        className="btn-primary w-full py-4 text-xs font-black uppercase tracking-[0.2em] shadow-xl disabled:opacity-50"
                                    >
                                        {adjustingLeave ? 'Updating...' : 'Update Balance'}
                                    </button>
                                    <button 
                                        onClick={() => setShowLeaveModal(false)}
                                        className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                                    >
                                        Cancel
                                    </button>
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
                            className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[2.5rem] p-10 shadow-2xl relative"
                        >
                            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-500 mx-auto mb-6">
                                <Zap size={28} />
                            </div>
                            <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight text-center mb-2">Promotion Suggestion</h2>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center mb-8">Recommend <span className="text-[var(--primary)]">{employee.fullName}</span> for advancement</p>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Target Role</label>
                                    <select 
                                        value={promotionForm.targetRole}
                                        onChange={(e) => setPromotionForm({...promotionForm, targetRole: e.target.value})}
                                        className="nx-input"
                                    >
                                        {Object.keys(t('employees.roles', { returnObjects: true })).map((role) => (
                                            <option key={role} value={role}>{t(`employees.roles.${role}`)}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Target Job Title</label>
                                    <input 
                                        type="text"
                                        value={promotionForm.targetJobTitle}
                                        onChange={(e) => setPromotionForm({...promotionForm, targetJobTitle: e.target.value})}
                                        className="nx-input"
                                        placeholder="e.g. Senior Software Engineer"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Proposed Salary (Annual)</label>
                                    <input 
                                        type="number"
                                        value={promotionForm.proposedSalary}
                                        onChange={(e) => setPromotionForm({...promotionForm, proposedSalary: e.target.value})}
                                        className="nx-input"
                                        placeholder="GHS"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Rationale / Reason</label>
                                    <textarea 
                                        value={promotionForm.reason}
                                        onChange={(e) => setPromotionForm({...promotionForm, reason: e.target.value})}
                                        placeholder="Explain why this employee deserves a promotion..."
                                        className="nx-input min-h-[100px] text-sm"
                                    />
                                </div>

                                <div className="flex flex-col gap-3 pt-4">
                                    <button 
                                        onClick={handlePromotionSubmit}
                                        disabled={submittingPromotion}
                                        className="btn-primary bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20 w-full py-4 text-xs font-black uppercase tracking-[0.2em] shadow-xl disabled:opacity-50"
                                    >
                                        {submittingPromotion ? 'Submitting...' : 'Submit Suggestion'}
                                    </button>
                                    <button 
                                        onClick={() => setShowPromotionModal(false)}
                                        className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                                    >
                                        Cancel
                                    </button>
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
