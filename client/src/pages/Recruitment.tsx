import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Filter, Briefcase, ChevronRight, Users, Clock, MapPin, Zap } from 'lucide-react';
import { cn } from '../utils/cn';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import CreateJobModal from '../components/recruitment/CreateJobModal';
import CandidateListModal from '../components/recruitment/CandidateListModal';

const Recruitment = () => {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<any[]>([]);
  const [recentApps, setRecentApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<{ id: string, title: string } | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/recruitment/jobs');
      setJobs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecentApps = useCallback(async () => {
    try {
      const res = await api.get('/recruitment/candidates');
      setRecentApps(res.data.slice(0, 5));
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    fetchRecentApps();
  }, [fetchJobs, fetchRecentApps]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
            Recruitment <span className="text-[var(--primary)]">Pulse</span>
          </h1>
          <p className="text-[var(--text-muted)] mt-2 font-medium">Manage your talent pipeline and job openings.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold text-sm hover:bg-[var(--bg-sidebar-active)] transition-all flex items-center gap-2 shadow-sm">
            <Filter size={18} />
            Filters
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary"
          >
            <Plus size={18} />
            New Opening
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Active Openings', value: jobs.length.toString(), icon: Briefcase, color: 'blue' },
          { label: 'Total Candidates', value: recentApps.length > 0 ? (recentApps.length * 3).toString() : '0', icon: Users, color: 'purple' },
          { label: 'Pipeline Velocity', value: 'High', icon: Zap, color: 'emerald' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-[2rem] bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xl relative overflow-hidden group"
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner",
                stat.color === 'blue' ? "bg-[var(--info)]/10 text-[var(--info)]" :
                stat.color === 'purple' ? "bg-[var(--primary)]/10 text-[var(--primary)]" :
                "bg-[var(--success)]/10 text-[var(--success)]"
              )}>
                <stat.icon size={28} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">{stat.label}</p>
                <p className="text-3xl font-black text-[var(--text-primary)] mt-1">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Job Listings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tight text-[var(--text-primary)]">Active Openings</h2>
            <button 
              onClick={() => setSelectedJob({ id: 'all', title: 'All Active Openings' })}
              className="text-[var(--primary)] text-sm font-bold hover:underline"
            >
              View Full Pipeline
            </button>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-12 rounded-[2rem] border-2 border-dashed border-[var(--border-subtle)] text-center space-y-4">
                <div className="w-20 h-20 bg-[var(--bg-card)] rounded-full flex items-center justify-center mx-auto text-[var(--text-muted)] opacity-50">
                  <Briefcase size={40} />
                </div>
                <p className="text-[var(--text-muted)] font-medium">{t('recruitment.no_jobs', 'No active job openings found.')}</p>
                <button className="text-[var(--primary)] font-bold">Post your first job</button>
              </div>
            ) : (
              jobs.map((job) => (
                <motion.div
                  key={job.id}
                  variants={itemVariants}
                  onClick={() => setSelectedJob({ id: job.id, title: job.title })}
                  className="p-6 rounded-[2rem] bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)]/30 hover:shadow-2xl transition-all group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] font-bold group-hover:scale-110 transition-transform">
                        {job.title[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-black text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">{job.title}</h3>
                        <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)] font-bold">
                          <span className="flex items-center gap-1"><MapPin size={12} /> {job.location || 'Remote'}</span>
                          <span className="flex items-center gap-1"><Clock size={12} /> {job.employmentType || 'Full-time'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right mr-4 hidden sm:block">
                        <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest opacity-50">Candidates</p>
                        <p className="text-lg font-black text-[var(--text-primary)]">{job._count?.candidates || 0}</p>
                      </div>
                      <button className="p-2 rounded-xl bg-[var(--bg-sidebar-active)] text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        </div>

        {/* Sidebar Insights */}
        <div className="space-y-8">
          <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xl font-black leading-tight">Hire Faster with <br />Smart AI Insights</h3>
              <p className="text-white/80 mt-4 text-sm font-medium leading-relaxed">
                Connect your LinkedIn or Job Boards to sync candidates instantly into your workspace.
              </p>
              <button className="mt-8 px-6 py-3 bg-white text-[var(--primary)] rounded-2xl font-black text-sm hover:scale-105 transition-transform">
                Connect Now
              </button>
            </div>
            <Briefcase size={120} className="absolute bottom-[-20px] right-[-20px] text-white/10 rotate-12" />
          </div>

          <div className="p-6 rounded-[2rem] bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-6">
            <h3 className="font-black text-[var(--text-primary)] flex items-center gap-2">
              <Clock size={18} className="text-orange-500" />
              Recent Applications
            </h3>
            <div className="space-y-4">
              {recentApps.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] italic py-4">No recent applications.</p>
              ) : recentApps.map((app) => (
                <div key={app.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[var(--bg-sidebar-active)] transition-colors cursor-pointer group">
                  <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-xs font-black text-[var(--text-primary)]">
                    {app.fullName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--primary)] transition-colors">{app.fullName}</p>
                    <p className="text-[10px] text-[var(--text-muted)] font-black uppercase opacity-60">Applied for {app.jobPosition?.title || 'a position'}</p>
                  </div>
                  {app.status === 'APPLIED' && <span className="text-[10px] font-black text-blue-500 bg-blue-500/10 px-2 py-1 rounded-lg">New</span>}
                </div>
              ))}
            </div>
            <button className="w-full py-3 rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] font-bold text-xs hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all">
              View All Pipeline
            </button>
          </div>
        </div>
      </div>

      <CreateJobModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchJobs} 
      />

      <CandidateListModal 
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        jobId={selectedJob?.id || ''}
        jobTitle={selectedJob?.title || ''}
      />
    </div>
  );
};

export default Recruitment;
