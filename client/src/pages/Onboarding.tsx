import { useEffect, useState } from 'react';
import { CheckCircle, Clock, Circle, Loader2, ChevronDown, ChevronRight, Rocket, ShieldCheck, Flag, Building2, Zap, GraduationCap } from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { getStoredUser } from '../utils/session';
import { useTranslation } from 'react-i18next';
import { getSafeAvatarUrl } from '../utils/avatar';

const categoryColors: Record<string, string> = {
  HR: 'text-[var(--primary)] border-[var(--primary)]/20 bg-[var(--primary)]/5',
  IT: 'text-[var(--info)] border-[var(--info)]/20 bg-[var(--info)]/5',
  Admin: 'text-[var(--warning)] border-[var(--warning)]/20 bg-[var(--warning)]/5',
  Manager: 'text-[var(--success)] border-[var(--success)]/20 bg-[var(--success)]/5',
  General: 'text-[var(--text-muted)] border-[var(--border-subtle)] bg-[var(--bg-elevated)]'
};

const Onboarding = () => {
  const { t, i18n } = useTranslation();
  const [sessions, setSessions] = useState<any[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [launchData, setLaunchData] = useState({ employeeId: '', templateId: '', startDate: new Date().toISOString().split('T')[0] });
  const [launching, setLaunching] = useState(false);
  const [viewMode, setViewMode] = useState<'PERSONAL' | 'MANAGEMENT'>('PERSONAL');

  const user = getStoredUser();
  const permissions = user.permissions || [];
  const has = (permission: string) => permissions.includes('*') || permissions.includes(permission);
  const canManage = has('onboarding.manage') || user?.role === 'IT_MANAGER' || user?.role === 'IT_ADMIN' || user?.role === 'HR_DIRECTOR' || user?.role === 'HR_MANAGER' || user?.role === 'MD' || user?.role === 'DEV';
  const isAdmin = canManage || has('account.provision') || has('card.production');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [myRes] = await Promise.all([api.get('/onboarding/my')]);
      setSessions(Array.isArray(myRes.data) ? myRes.data : []);
      
      if (canManage) {
        const [allRes, empRes, tempRes] = await Promise.all([
          api.get('/onboarding/all'),
          api.get('/users'),
          api.get('/onboarding/templates')
        ]);
        setAllSessions(Array.isArray(allRes.data) ? allRes.data : []);
        setEmployees(Array.isArray(empRes.data) ? empRes.data.filter((u: any) => u.status !== 'TERMINATED') : []);
        setTemplates(Array.isArray(tempRes.data) ? tempRes.data : []);
      } else if (isAdmin) {
        const taskRes = await api.get('/onboarding/department-tasks');
        const grouped = new Map<string, any>();
        for (const item of Array.isArray(taskRes.data) ? taskRes.data : []) {
          const sessionId = item.sessionId;
          if (!grouped.has(sessionId)) grouped.set(sessionId, { id: sessionId, employee: item.session?.employee, startDate: item.session?.startDate, template: { name: `${item.ownerRole} task queue` }, items: [], progress: 0 });
          grouped.get(sessionId).items.push(item);
        }
        for (const session of grouped.values()) {
          session.progress = session.items.length ? Math.round(session.items.filter((item: any) => item.completedAt).length / session.items.length * 100) : 0;
        }
        setAllSessions([...grouped.values()]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLaunchInduction = async () => {
    if (!launchData.employeeId || !launchData.templateId) return;
    setLaunching(true);
    try {
      await api.post('/onboarding/start', launchData);
      setShowLaunchModal(false);
      fetchData();
      setViewMode('MANAGEMENT');
    } catch (e) {
      console.error(e);
    } finally {
      setLaunching(false);
    }
  };

  const handleComplete = async (itemId: string) => {
    setCompleting(itemId);
    try {
      await api.post('/onboarding/task/complete', { itemId, notes: '' });
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setCompleting(null);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-3">
      <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
      <p className="text-[12px] font-medium text-[var(--text-muted)]">{t('onboarding.loading')}</p>
    </div>
  );

  return (
    <div className="space-y-8 page-enter min-h-screen pb-20">
      {/* Premium Welcome Banner */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] p-8 md:p-12 text-white shadow-2xl shadow-[var(--primary)]/20 mb-12">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-[10px] font-black uppercase tracking-widest">
              <Rocket size={12} />
              {t('onboarding.manager.manager_hub')}
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
              {viewMode === 'MANAGEMENT' ? t('onboarding.manager.title') : t('onboarding.welcome')} <br />
              <span className="text-white/80">{viewMode === 'MANAGEMENT' ? t('onboarding.manager.subtitle') : (user?.name || 'User')}</span>
            </h1>
            <p className="text-white/70 font-medium max-w-xl text-[14px]">
              {viewMode === 'MANAGEMENT' 
                ? t('onboarding.manager.description')
                : t('onboarding.description')}
            </p>

            {isAdmin && (
              <div className="flex flex-wrap gap-3 pt-4">
                <button
                  onClick={() => setViewMode('PERSONAL')}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                    viewMode === 'PERSONAL' ? "bg-white text-[var(--primary)] shadow-xl" : "bg-white/10 text-white hover:bg-white/20"
                  )}
                >
                  {t('onboarding.manager.my_checklist')}
                </button>
                <button
                  onClick={() => setViewMode('MANAGEMENT')}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                    viewMode === 'MANAGEMENT' ? "bg-white text-[var(--primary)] shadow-xl" : "bg-white/10 text-white hover:bg-white/20"
                  )}
                >
                  {t('onboarding.manager.manager_hub')}
                </button>
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-2">
            {viewMode === 'PERSONAL' ? (
              <>
                <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center mb-2">
                  <span className="text-3xl font-black">{Math.round(sessions[0]?.progress || 0)}%</span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60">{t('onboarding.progress')}</p>
              </>
            ) : canManage ? (
              <button
                onClick={() => setShowLaunchModal(true)}
                className="w-24 h-24 rounded-3xl bg-white text-[var(--primary)] shadow-2xl flex flex-col items-center justify-center gap-1 hover:scale-105 transition-all group"
              >
                <Rocket size={24} className="group-hover:animate-bounce" />
                <span className="text-[9px] font-black uppercase tracking-tight">{t('onboarding.manager.launch')}</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {viewMode === 'PERSONAL' ? (
        <>
          {/* Success Track Guides */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {[
              { icon: Building2, label: t('onboarding.guides.handbook'), desc: t('onboarding.guides.handbook_desc'), color: 'info' },
              { icon: Zap, label: t('onboarding.guides.it'), desc: t('onboarding.guides.it_desc'), color: 'warning' },
              { icon: ShieldCheck, label: t('onboarding.guides.culture'), desc: t('onboarding.guides.culture_desc'), color: 'success' },
              { icon: GraduationCap, label: t('onboarding.guides.career'), desc: t('onboarding.guides.career_desc'), color: 'primary' }
            ].map((guide, idx) => (
              <motion.div
                key={guide.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="nx-card p-6 border-none bg-[var(--bg-elevated)]/40 hover:bg-[var(--bg-elevated)] transition-all cursor-pointer group"
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-xl",
                  guide.color === 'info' ? "bg-[var(--info)]/10 text-[var(--info)]" :
                  guide.color === 'warning' ? "bg-[var(--warning)]/10 text-[var(--warning)]" :
                  guide.color === 'success' ? "bg-[var(--success)]/10 text-[var(--success)]" :
                  "bg-[var(--primary)]/10 text-[var(--primary)]"
                )}>
                  <guide.icon size={22} />
                </div>
                <h3 className="text-[13px] font-black text-[var(--text-primary)] mb-1 uppercase tracking-tight">{guide.label}</h3>
                <p className="text-[10px] font-medium text-[var(--text-muted)] line-clamp-1">{guide.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* My Active Tasks */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 ml-1">
              <h2 className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-primary)]">{t('onboarding.active_tasks')}</h2>
            </div>

            {sessions.length === 0 && (
              <div className="nx-card p-20 text-center flex flex-col items-center">
                <Flag size={48} className="mx-auto mb-4 text-[var(--text-muted)] opacity-20" />
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">{t('onboarding.no_tasks')}</h2>
                <p className="text-[13px] text-[var(--text-secondary)] max-w-xs mx-auto">{t('onboarding.no_tasks_tip')}</p>
              </div>
            )}

            {(sessions || []).map((session: any, sIdx: any) => {
              const isOpen = expanded === session.id;
              const items = Array.isArray(session.items) ? session.items : [];
              const doneCount = items.filter((i: any) => i.completedAt).length;
              const totalCount = items.length;

              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: sIdx * 0.05 }}
                  className="nx-card overflow-hidden"
                >
                  <div
                    className="px-6 py-6 flex flex-col md:flex-row md:items-center gap-6 cursor-pointer group"
                    onClick={() => setExpanded(isOpen ? null : session.id)}
                  >
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center border border-[var(--border-subtle)] transition-colors group-hover:border-[var(--primary)]/30">
                          <ShieldCheck className="text-[var(--primary)]" size={20} />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{session.template?.name}</h2>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border",
                              session.completedAt ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/10" : "bg-amber-500/5 text-amber-600 border-amber-500/10"
                            )}>
                              {session.completedAt ? t('onboarding.completed') : t('onboarding.in_progress')}
                            </span>
                            <span className="text-[10px] font-medium text-[var(--text-muted)]">{t('onboarding.started')}: {new Date(session.startDate).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="flex-1 w-full bg-[var(--bg-elevated)] h-1.5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${session.progress}%` }}
                            transition={{ duration: 1.2, ease: 'easeOut' }}
                            className="h-full bg-[var(--primary)]"
                          />
                        </div>
                        <div className="flex items-center gap-6 whitespace-nowrap">
                          <div className="flex flex-col items-end">
                            <span className="text-lg font-bold text-[var(--primary)] leading-none">{session.progress}%</span>
                            <span className="text-[10px] font-medium text-[var(--text-muted)]">{t('onboarding.progress')}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-lg font-bold text-[var(--text-primary)] leading-none">{doneCount} <span className="opacity-30">/</span> {totalCount}</span>
                            <span className="text-[10px] font-medium text-[var(--text-muted)]">{t('onboarding.tasks_done')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-center md:justify-end">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:border-[var(--primary)]/30 transition-all flex items-center justify-center">
                        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30"
                      >
                        <div className="px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {(Array.isArray(session.items) ? session.items : []).map((item: any, iIdx: any) => {
                            const isDone = !!item.completedAt;
                            const isOverdue = !isDone && item.dueDate && new Date(item.dueDate) < new Date();
                            const Theme = categoryColors[item.category] || categoryColors.General;

                            return (
                              <motion.div
                                key={item.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: iIdx * 0.03 }}
                                className={cn(
                                  "relative p-4 rounded-xl border transition-all duration-300",
                                  isDone ? "bg-emerald-500/[0.01] border-emerald-500/10 opacity-70" : isOverdue ? "bg-rose-500/[0.01] border-rose-500/10" : "bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--primary)]/30"
                                )}>

                                <div className="flex items-start gap-4">
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => !isDone && handleComplete(item.id)}
                                    disabled={isDone || completing === item.id}
                                    className={cn(
                                      "mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all",
                                      isDone ? "bg-emerald-500 border-emerald-500 text-white" : "bg-transparent border-[var(--border-subtle)] hover:border-[var(--primary)] text-[var(--text-muted)]"
                                    )}
                                  >
                                    {completing === item.id ? (
                                      <Loader2 size={12} className="animate-spin" />
                                    ) : isDone ? (
                                      <CheckCircle size={14} />
                                    ) : <Circle size={14} />}
                                  </motion.button>

                                  <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className={cn(
                                        "font-bold text-[13px] tracking-tight",
                                        isDone ? "text-[var(--text-muted)] line-through" : "text-[var(--text-primary)]"
                                      )}>{item.title}</p>
                                      <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border", Theme)}>
                                        {t(`onboarding.roles.${item.category}`)}
                                      </span>
                                      {item.isRequired && !isDone && <span className="text-[9px] font-bold uppercase tracking-wider text-rose-500 bg-rose-500/5 px-2 py-0.5 rounded-lg border border-rose-500/10">{t('onboarding.required')}</span>}
                                    </div>

                                    <div className="flex items-center gap-4">
                                      {item.dueDate && (
                                        <div className={cn("flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider", isOverdue && !isDone ? "text-rose-500" : "text-[var(--text-muted)]")}>
                                          <Clock size={12} />
                                          {t('onboarding.due')}: {new Date(item.dueDate).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')}
                                        </div>
                                      )}
                                      {isDone && (
                                        <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                                          <ShieldCheck size={12} />
                                          {t('onboarding.done')}: {new Date(item.completedAt).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between ml-1">
            <h2 className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-primary)]">{t('onboarding.manager.all_sessions')}</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{t('onboarding.manager.real_time')}</span>
            </div>
          </div>

          {allSessions.length === 0 ? (
            <div className="nx-card p-20 text-center flex flex-col items-center">
              <Rocket size={48} className="mx-auto mb-4 text-[var(--text-muted)] opacity-20" />
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">{t('onboarding.manager.no_sessions')}</h2>
              <p className="text-[13px] text-[var(--text-secondary)] max-w-xs mx-auto">{t('onboarding.manager.start_tip')}</p>
            </div>
          ) : (
            <div className="nx-table-container">
              <table className="nx-table">
                <thead>
                  <tr>
                    <th className="text-left">{t('onboarding.employee')}</th>
                    <th className="text-left">{t('onboarding.template')}</th>
                    <th className="text-left">{t('onboarding.progress')}</th>
                    <th className="text-left">{t('onboarding.manager.start_date')}</th>
                    <th className="text-right">{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {allSessions.map((s: any) => (
                    <tr key={s.id} className="hover:bg-[var(--bg-elevated)] transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center transition-all group-hover:border-[var(--primary)]/50">
                            <img 
                                src={getSafeAvatarUrl(s.employee?.avatarUrl, s.employee?.fullName)} 
                                alt={s.employee?.fullName} 
                                className="w-full h-full object-cover" 
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = getSafeAvatarUrl(undefined, s.employee?.fullName);
                                }}
                            />
                          </div>
                          <div>
                            <p className="font-bold text-[13px] text-[var(--text-primary)]">{s.employee?.fullName}</p>
                            <p className="text-[10px] font-medium text-[var(--text-muted)]">{s.employee?.jobTitle}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[12px] font-medium text-[var(--text-secondary)]">{s.template?.name}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 w-24 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--primary)] transition-all duration-1000" style={{ width: `${s.progress}%` }} />
                          </div>
                          <span className="text-[11px] font-bold text-[var(--primary)]">{s.progress}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[11px] font-medium text-[var(--text-muted)]">{new Date(s.startDate).toLocaleDateString()}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {!canManage && s.items?.some((item: any) => !item.completedAt) && (
                          <button onClick={() => handleComplete(s.items.find((item: any) => !item.completedAt).id)} className="mr-2 px-3 py-1 rounded-lg bg-[var(--primary)] text-white text-[9px] font-bold uppercase">
                            Complete next task
                          </button>
                        )}
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border",
                          s.completedAt ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/10" : "bg-amber-500/5 text-amber-600 border-amber-500/10"
                        )}>
                          {s.completedAt ? t('onboarding.completed') : t('onboarding.in_progress')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Launch Induction Modal */}
      <AnimatePresence>
        {showLaunchModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLaunchModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[var(--bg-card)] rounded-[2.5rem] shadow-2xl border border-[var(--border-subtle)] overflow-hidden"
            >
              <div className="p-8 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                    <Rocket size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">{t('onboarding.manager.launch_title')}</h2>
                    <p className="text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-widest">{t('onboarding.manager.launch_subtitle')}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Employee Selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                       {t('onboarding.manager.select_employee')}
                    </label>
                        <select
                          value={launchData.employeeId}
                          onChange={(e) => setLaunchData({ ...launchData, employeeId: e.target.value })}
                          className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3.5 text-[14px] font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]/50 transition-all appearance-none"
                        >
                          <option value="">{t('onboarding.manager.select_employee')}...</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.jobTitle})</option>
                          ))}
                        </select>
                  </div>

                  {/* Template Selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                       {t('onboarding.manager.select_template')}
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                      {templates.map((temp) => (
                        <div
                          key={temp.id}
                          onClick={() => setLaunchData({ ...launchData, templateId: temp.id })}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group",
                            launchData.templateId === temp.id ? "bg-[var(--primary)] border-[var(--primary)] text-white" : "bg-[var(--bg-elevated)] border-[var(--border-subtle)] hover:border-[var(--primary)]/30"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                            launchData.templateId === temp.id ? "bg-white/20" : "bg-white text-[var(--primary)]"
                          )}>
                            <Flag size={18} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-[13px] tracking-tight">{temp.name}</h4>
                            <p className={cn(
                              "text-[10px] font-medium",
                              launchData.templateId === temp.id ? "text-white/70" : "text-[var(--text-muted)]"
                            )}>{t('onboarding.manager.tasks_count', { count: temp.tasks?.length || 0 })} • {temp.description || t('onboarding.manager.roadmap')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Start Date */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                       {t('onboarding.manager.start_date')}
                    </label>
                    <input
                      type="date"
                      value={launchData.startDate}
                      onChange={(e) => setLaunchData({ ...launchData, startDate: e.target.value })}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3.5 text-[14px] font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]/50 transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowLaunchModal(false)}
                    className="flex-1 px-6 py-4 rounded-2xl bg-[var(--bg-elevated)] text-[var(--text-primary)] text-[12px] font-black uppercase tracking-widest hover:bg-[var(--bg-elevated)]/80 transition-all border border-[var(--border-subtle)]"
                  >
                    {t('onboarding.manager.cancel')}
                  </button>
                  <button
                    onClick={handleLaunchInduction}
                    disabled={launching || !launchData.employeeId || !launchData.templateId}
                    className="flex-[2] px-6 py-4 rounded-2xl bg-[var(--primary)] text-white text-[12px] font-black uppercase tracking-widest shadow-xl shadow-[var(--primary)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {launching ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
                    {t('onboarding.manager.launch_mission')}
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

export default Onboarding;
