import React, { useState, useEffect } from 'react';
import { toast } from '../../utils/toast';
import { motion } from 'framer-motion';
import { Megaphone, Plus, Trash2, Calendar, Users, Globe, Building } from 'lucide-react';
import api from '../../services/api';

const AnnouncementManager = () => {
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        targetAudience: 'ALL',
        departmentId: '',
        priority: 'NORMAL',
        expirationDate: ''
    });

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            const res = await api.get('/announcements');
            setAnnouncements(Array.isArray(res.data) ? res.data : []);
        } catch { /* ignore */ } finally { setLoading(false); }
    };

    useEffect(() => { fetchAnnouncements(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/announcements', formData);
            setIsCreating(false);
            setFormData({ title: '', content: '', targetAudience: 'ALL', departmentId: '', priority: 'NORMAL', expirationDate: '' });
            fetchAnnouncements();
        } catch (err) {
            toast.info('Failed to create announcement');
        }
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-[var(--text-primary)]">Announcement Engine</h1>
                    <p className="text-slate-500">Targeted communication across the organization.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="premium-btn flex items-center gap-2"
                >
                    <Plus size={20} />
                    <span>Broadcast Message</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {announcements.map((a) => (
                    <div key={a.id} className="glass-card p-6 rounded-[2rem] flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest
                  ${a.priority === 'URGENT' ? 'bg-rose-500/20 text-rose-500' : 'bg-primary/20 text-primary-light'}`}>
                                    {a.priority}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                    {a.targetAudience === 'ALL' && <Globe size={10} />}
                                    {a.targetAudience === 'DEPARTMENT' && <Building size={10} />}
                                    {a.targetAudience}
                                </span>
                            </div>
                            <h4 className="text-lg font-bold text-[var(--text-primary)] mb-2">{a.title}</h4>
                            <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-4">{a.content}</p>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-white/5">
                            <span className="text-[10px] font-bold text-slate-500">By {a.createdBy?.fullName}</span>
                            <button
                                onClick={async () => { await api.delete(`/announcements/${a.id}`); fetchAnnouncements(); }}
                                className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isCreating && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl">
                    <motion.form
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onSubmit={handleCreate}
                        className="w-full max-w-2xl glass-card p-10 rounded-[2.5rem] space-y-6"
                    >
                        <h2 className="text-2xl font-black text-[var(--text-primary)]">New Broadcast</h2>
                        <div className="space-y-4">
                            <input
                                placeholder="Announcement Title"
                                className="nx-input"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                            <textarea
                                placeholder="Content Body"
                                className="nx-input min-h-[120px]"
                                value={formData.content}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                                required
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <select
                                    className="nx-input"
                                    value={formData.targetAudience}
                                    onChange={e => setFormData({ ...formData, targetAudience: e.target.value })}
                                >
                                    <option value="ALL">All Staff</option>
                                    <option value="DEPARTMENT">Department Only</option>
                                    <option value="MANAGERS">Managers Only</option>
                                    <option value="EXECUTIVES">Executives Only</option>
                                </select>
                                <select
                                    className="nx-input"
                                    value={formData.priority}
                                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                >
                                    <option value="LOW">Low Priority</option>
                                    <option value="NORMAL">Normal</option>
                                    <option value="HIGH">High Priority</option>
                                    <option value="URGENT">Urgent Alert</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button type="submit" className="premium-btn flex-1">Launch Broadcast</button>
                            <button type="button" onClick={() => setIsCreating(false)} className="px-6 rounded-2xl border border-[var(--border-subtle)] text-[var(--text-secondary)] font-bold hover:bg-[var(--bg-elevated)] transition-all">Cancel</button>
                        </div>
                    </motion.form>
                </div>
            )}
        </div>
    );
};

export default AnnouncementManager;
