import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, Layers, Zap, TrendingUp } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import { cn } from '../../utils/cn';
import { usePersistentDraft } from '../../hooks/usePersistentDraft';
import { getStoredUser } from '../../utils/session';
import { useTranslation } from 'react-i18next';

interface TargetModel {
  id: string;
  title: string;
  level: string;
  status: string;
  contributionWeight?: number;
}

const StrategicGoalBuilder = () => {
  const { t } = useTranslation();
  const user = getStoredUser();
  const [deptGoals, setDeptGoals] = useState<TargetModel[]>([]);
  const [, setLoading] = useState(true);
  const [showNewGoal, setShowNewGoal] = useState(false);
  
  const {
    data: newGoal,
    updateDraft: setNewGoal
  } = usePersistentDraft('strategic_goal_drafts', user?.id || 'anonymous', { 
    title: '', 
    description: '', 
    level: 'DEPARTMENT' 
  });

  const [linkingTarget, setLinkingTarget] = useState<string | null>(null);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const { data } = await api.get('/targets?level=DEPARTMENT');
      setDeptGoals(data);
    } catch (err) {
      console.error('Failed to fetch goals');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    try {
      await api.post('/targets', newGoal);
      setShowNewGoal(false);
      fetchGoals();
    } catch (err) {
      alert('Failed to create goal');
    }
  };

  return (
    <div className="space-y-10 pb-20 page-transition">
      <PageHeader 
        title={t('performance.builder.title')}
        description={t('performance.builder.subtitle')}
        icon={Layers}
        variant="indigo"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left: Departmental Goals */}
        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{t('performance.builder.dept_goals')}</h3>
            <button 
              onClick={() => setShowNewGoal(true)}
              className="p-2 rounded-xl bg-[var(--growth)]/10 text-[var(--growth-light)] hover:bg-[var(--growth)]/20 transition-all"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="space-y-4">
            {deptGoals.map((goal) => (
              <motion.div 
                key={goal.id}
                layoutId={goal.id}
                onClick={() => setLinkingTarget(goal.id)}
                className={cn(
                  "glass p-6 cursor-pointer transition-all border-2",
                  linkingTarget === goal.id ? "border-[var(--growth)] bg-[var(--growth)]/5" : "border-white/5 hover:border-white/20"
                )}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-[var(--growth)]/10 text-[var(--growth-light)]">
                    <Zap size={16} />
                  </div>
                  <h4 className="font-bold text-white text-sm">{goal.title}</h4>
                </div>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <span>{t('performance.builder.progress')}</span>
                  <span className="text-white">{t('performance.builder.calculating')}</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '45%' }} className="h-full bg-[var(--growth)] shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                </div>
              </motion.div>
            ))}

            {showNewGoal && (
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass p-6 border-[var(--growth)]/30">
                  <input 
                    autoFocus
                    placeholder={t('performance.builder.goal_placeholder')}
                    className="bg-transparent border-none text-white font-bold text-sm w-full outline-none mb-4"
                    onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                  />
                  <div className="flex gap-2">
                    <button onClick={handleCreateGoal} className="flex-1 py-2 rounded-xl bg-[var(--growth)] text-[var(--text-inverse)] text-[10px] font-black uppercase tracking-widest">{t('performance.builder.create')}</button>
                    <button onClick={() => setShowNewGoal(false)} className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('performance.builder.cancel')}</button>
                  </div>
               </motion.div>
            )}
          </div>
        </div>

        {/* Right: Cascade Area */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {linkingTarget ? (
              <motion.div 
                key={linkingTarget}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="glass p-8 bg-[var(--growth)]/[0.02]">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="font-display font-bold text-2xl text-white">{t('performance.builder.breakdown')}</h3>
                      <p className="text-xs text-slate-500 mt-1">{t('performance.builder.breakdown_desc')}</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--success)]/10 border border-[var(--success)]/20 text-[var(--success)] text-[10px] font-black uppercase tracking-widest">
                      <TrendingUp size={12} /> {t('performance.builder.alignment')}
                    </div>
                  </div>

                  <div className="p-10 border-2 border-dashed border-white/5 rounded-[2rem] flex flex-col items-center justify-center text-center group hover:border-[var(--growth)]/30 transition-all cursor-pointer">
                    <div className="w-16 h-16 rounded-[2rem] bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[var(--growth)]/10 transition-all">
                      <Plus size={32} className="text-slate-600 group-hover:text-[var(--growth-light)]" />
                    </div>
                    <h4 className="font-bold text-white mb-2">{t('performance.builder.new_objective')}</h4>
                    <p className="text-xs text-slate-500 max-w-[200px]">{t('performance.builder.assign_desc')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2].map(i => (
                    <div key={i} className="glass p-6 border-white/5 bg-white/[0.01]">
                       <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase">JS</div>
                          <div>
                             <p className="text-xs font-bold text-white">John Staffman</p>
                             <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Sales Representative</p>
                          </div>
                       </div>
                       <p className="text-sm font-bold text-slate-300 mb-6 underline decoration-[var(--growth)]/50 underline-offset-4">Increase B2B Lead Conversion</p>
                       <div className="flex items-center justify-between">
                          <div className="px-3 py-1 rounded-lg bg-[var(--growth)]/10 text-[var(--growth-light)] text-[10px] font-black uppercase tracking-widest">
                             {t('performance.builder.contribution', { percent: 30 })}
                          </div>
                          <div className="text-xs font-bold text-white">{t('performance.builder.done_percent', { percent: 75 })}</div>
                       </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="h-full min-h-[400px] border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center text-center p-10">
                <div className="p-6 rounded-[2rem] bg-white/5 mb-6">
                  <Target size={48} className="text-slate-700 opacity-50" />
                </div>
                <h3 className="font-display font-bold text-xl text-white mb-2">{t('performance.builder.select_goal')}</h3>
                <p className="text-sm text-slate-500 max-w-[300px]">{t('performance.builder.select_tip')}</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default StrategicGoalBuilder;
