import React, { useState, useEffect } from 'react';
import { 
  Megaphone, Plus, Search, Trash2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { getStoredUser } from '../utils/session';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { toast } from 'react-hot-toast';
import AnnouncementDetailModal from '../components/announcements/AnnouncementDetailModal';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  targetAudience: 'ALL' | 'DEPARTMENT' | 'MANAGERS' | 'EXECUTIVES';
  createdAt: string;
  createdBy: {
    fullName: string;
    role: string;
    avatarUrl?: string;
  };
  department?: {
    name: string;
  };
}

const Announcements = () => {
  const { t } = useTranslation();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const user = getStoredUser();
  const normalizedRole = (user?.role || '').toUpperCase().replace(/ /g, '_');
  const canPost = ['MARKETING_HEAD', 'HR_DIRECTOR', 'HR_MANAGER', 'HR_OFFICER', 'HR', 'HR_ADMIN', 'MD', 'DEV'].includes(normalizedRole);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'NORMAL',
    targetAudience: 'ALL',
    expirationDate: ''
  });

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/announcements');
      setAnnouncements(res.data);
    } catch (err) {
      console.error('Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/announcements', formData);
      toast.success('Announcement published!');
      setIsModalOpen(false);
      setFormData({ title: '', content: '', priority: 'NORMAL', targetAudience: 'ALL', expirationDate: '' });
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to publish');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      toast.success('Deleted');
      fetchAnnouncements();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleOpenDetail = (anno: Announcement) => {
    setSelectedAnnouncement(anno);
    setIsDetailOpen(true);
  };

  const filtered = (announcements || []).filter(a => 
    a?.title?.toLowerCase().includes(search?.toLowerCase() || '') || 
    a?.content?.toLowerCase().includes(search?.toLowerCase() || '')
  );

  const getPriorityStyle = (p: string) => {
    switch(p) {
      case 'URGENT': return 'badge-error';
      case 'HIGH': return 'badge-warning';
      case 'NORMAL': return 'badge-info';
      default: return 'badge-success';
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto min-h-screen bg-[var(--bg-main)] pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-8 sm:mb-12">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <div className="w-1.5 h-7 bg-[var(--primary)] rounded-full" />
              <h1 className="text-2xl sm:text-4xl font-black text-[var(--text-primary)] tracking-tight">
                {t('common.announcements', 'Announcements')}
              </h1>
           </div>
          <p className="text-[var(--text-secondary)] font-medium max-w-xl opacity-80 text-sm">
            MCB Bulletin System: Official organization-wide updates and critical dispatches.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" size={18} />
            <input
              type="text"
              placeholder="Filter Bulletin..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 pr-4 py-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl w-full sm:w-72 focus:border-[var(--primary)] outline-none transition-all font-bold text-sm text-[var(--text-primary)]"
            />
          </div>

          {canPost && (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-2xl transition-all font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-[var(--primary)]/20"
            >
              <Plus size={18} />
              <span>{t('announcements.post', 'Create Dispatch')}</span>
            </motion.button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
           <div className="w-12 h-12 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-24 bg-[var(--bg-card)] rounded-[3rem] border-2 border-dashed border-[var(--border-subtle)] opacity-40">
          <Megaphone size={64} className="mb-6 text-[var(--text-muted)]" />
          <p className="text-xl font-black uppercase tracking-widest text-[var(--text-muted)]">No active bulletins found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((anno, idx) => (
            <motion.div 
              key={anno.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => handleOpenDetail(anno)}
              className="bg-[var(--bg-card)] rounded-3xl p-6 sm:p-8 border border-[var(--border-subtle)] hover:border-[var(--primary)]/30 transition-all shadow-sm hover:shadow-md relative overflow-hidden group cursor-pointer flex flex-col h-full"
            >
              <div className="flex justify-between items-center mb-5">
                <span className={cn("px-3 py-1 rounded-xl text-[9px] font-black tracking-[0.15em] uppercase border", getPriorityStyle(anno.priority))}>
                  {anno.priority} Bulletin
                </span>

                {canPost && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(anno.id); }}
                    className="p-2.5 text-[var(--status-error-text)] bg-[var(--status-error-bg)] hover:opacity-80 rounded-xl opacity-0 group-hover:opacity-100 transition-all border border-[var(--status-error-border)]"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              <h2 className="text-lg sm:text-xl font-black text-[var(--text-primary)] mb-3 leading-tight tracking-tight uppercase group-hover:text-[var(--primary)] transition-colors">
                {anno.title}
              </h2>

              <div className="text-[var(--text-secondary)] leading-relaxed mb-6 text-[13px] font-medium line-clamp-3 overflow-hidden">
                {anno.content}
              </div>

              <div className="mt-auto pt-5 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] font-black text-xs flex-shrink-0">
                    {anno.createdBy.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-black text-[var(--text-primary)] uppercase tracking-tight truncate">{anno.createdBy.fullName}</p>
                    <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest">{anno.createdBy.role}</p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.1em] mb-1">REFERENCE</p>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded-md border border-[var(--border-subtle)]">ID-{anno.id.slice(0, 5).toUpperCase()}</p>
                </div>
              </div>

              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[var(--bg-elevated)] to-transparent rounded-bl-full pointer-events-none" />
            </motion.div>
          ))}
        </div>
      )}

      {/* Formal Detail Modal */}
      <AnnouncementDetailModal 
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        announcement={selectedAnnouncement}
      />

      {/* Post Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="relative bg-[var(--bg-card)] rounded-t-3xl sm:rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-[var(--border-subtle)] max-h-[92dvh] flex flex-col"
            >
              <div className="p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-[var(--primary)]/10 rounded-2xl text-[var(--primary)]">
                    <Megaphone size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-[var(--text-primary)]">New Announcement</h3>
                    <p className="text-sm text-[var(--text-muted)]">Reach everyone in the organization.</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1">Title</label>
                    <input 
                      required
                      type="text" 
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      placeholder="Enter a descriptive title..."
                      className="w-full px-5 py-3.5 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-2xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1">Content</label>
                    <textarea 
                      required
                      rows={5}
                      value={formData.content}
                      onChange={e => setFormData({...formData, content: e.target.value})}
                      placeholder="What's the update?"
                      className="w-full px-5 py-3.5 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-2xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1">Priority</label>
                      <select 
                        value={formData.priority}
                        onChange={e => setFormData({...formData, priority: e.target.value})}
                        className="w-full px-5 py-3.5 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-2xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                      >
                        <option value="NORMAL">Normal</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent!</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1">Audience</label>
                      <select 
                        value={formData.targetAudience}
                        onChange={e => setFormData({...formData, targetAudience: e.target.value})}
                        className="w-full px-5 py-3.5 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-2xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                      >
                        <option value="ALL">All Staff</option>
                        <option value="MANAGERS">Managers Only</option>
                        <option value="DEPARTMENT">My Department</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-4">
                    <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-6 py-4 rounded-2xl font-bold text-[var(--text-primary)] bg-[var(--bg-input)] hover:opacity-80 transition-all border border-[var(--border-subtle)]"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-4 rounded-2xl font-bold text-white bg-[var(--primary)] hover:opacity-90 transition-all shadow-xl shadow-[var(--primary)]/20"
                    >
                      Publish
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Announcements;
