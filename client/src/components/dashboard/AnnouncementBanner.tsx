import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, X, ChevronRight, Zap } from 'lucide-react';
import api from '../../services/api';
import AnnouncementDetailModal from '../announcements/AnnouncementDetailModal';
import { cn } from '../../utils/cn';

interface Announcement {
    id: string;
    title: string;
    content: string;
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    targetAudience: 'ALL' | 'DEPARTMENT' | 'MANAGERS' | 'EXECUTIVES';
    createdAt: string;
    createdBy: { fullName: string; role: string };
}

const AnnouncementBanner = () => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
            const res = await api.get('/announcements');
            const data = (Array.isArray(res.data) ? res.data : []).filter(Boolean);
            
            // Filter out dismissed announcements
            let dismissedIds: string[] = [];
            try {
                dismissedIds = JSON.parse(localStorage.getItem('dismissed_announcements') || '[]');
            } catch (e) {
                dismissedIds = [];
            }
            const filtered = data.filter((a: Announcement) => a && !dismissedIds.includes(a.id));
            
            setAnnouncements(filtered);
        } catch (err) {
            console.error('Failed to fetch announcements:', err);
        }
    };
    fetchAnnouncements();
}, []);

const handleDismiss = (id: string) => {
    let dismissedIds: string[] = [];
    try {
        dismissedIds = JSON.parse(localStorage.getItem('dismissed_announcements') || '[]');
    } catch (e) {
        dismissedIds = [];
    }
    if (!Array.isArray(dismissedIds)) dismissedIds = [];
    
    if (!dismissedIds.includes(id)) {
        dismissedIds.push(id);
        localStorage.setItem('dismissed_announcements', JSON.stringify(dismissedIds));
    }

    // If we have more, show next, else hide
    if (announcements.length > 1) {
        const nextAnnouncements = announcements.filter(a => a && a.id !== id);
        setAnnouncements(nextAnnouncements);
        setCurrentIdx(0);
    } else {
        setIsVisible(false);
    }
};

const handleOpenDetail = (anno: Announcement) => {
    setSelectedAnnouncement(anno);
    setIsDetailOpen(true);
};

if (!Array.isArray(announcements) || announcements.length === 0 || !isVisible || !announcements[currentIdx]) return null;

const current = announcements[currentIdx];

    const priorityColors = {
        URGENT: 'text-rose-600 bg-rose-50 border-rose-200',
        HIGH: 'text-amber-600 bg-amber-50 border-amber-200',
        NORMAL: 'text-[var(--primary)] bg-[var(--primary)]/5 border-[var(--primary)]/20',
        LOW: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    };

    const config = priorityColors[current.priority] || priorityColors.NORMAL;

    return (
        <>
            <motion.div
                initial={{ y: -100, x: '-50%', opacity: 0, scale: 0.9 }}
                animate={{ y: 0, x: '-50%', opacity: 1, scale: 1 }}
                exit={{ y: -100, x: '-50%', opacity: 0, scale: 0.9 }}
                className="fixed top-8 left-1/2 z-[10001] w-[90%] max-w-2xl"
            >
                <div className="relative p-6 sm:p-8 rounded-[2.5rem] bg-white/80 backdrop-blur-2xl border border-white/40 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)] flex flex-col sm:flex-row items-center justify-between gap-6 group overflow-hidden">
                    {/* Progress Bar for priority attention */}
                    <div className={cn("absolute bottom-0 left-0 h-1 bg-current opacity-20", config.split(' ')[0])} style={{ width: '100%' }} />

                    <div className="flex items-center gap-5 w-full">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transform transition-transform group-hover:rotate-12", config)}>
                            {current.priority === 'URGENT' ? <Zap size={24} /> : <Megaphone size={24} />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md border", config)}>
                                    {current.priority} Bulletin
                                </span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(current.createdAt).toLocaleDateString()}</span>
                            </div>
                            <h4 className="text-[15px] font-black text-slate-900 leading-tight truncate uppercase tracking-tight">{current.title}</h4>
                            <p className="text-[11px] text-slate-500 font-medium line-clamp-1 opacity-80 mt-1">{current.content}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <button 
                            onClick={() => handleOpenDetail(current)}
                            className="h-12 px-6 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all flex items-center gap-2"
                        >
                            Read More
                        </button>
                        
                        <div className="flex flex-col gap-1">
                            <button 
                                onClick={() => handleDismiss(current.id)}
                                className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all rounded-xl"
                                title="Dismiss notification"
                            >
                                <X size={20} />
                            </button>
                            {announcements.length > 1 && (
                                <button 
                                    onClick={() => setCurrentIdx((currentIdx + 1) % announcements.length)}
                                    className="p-3 text-slate-400 hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all rounded-xl"
                                    title="Next Announcement"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            <AnnouncementDetailModal 
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                announcement={selectedAnnouncement}
            />
        </>
    );
};

export default AnnouncementBanner;
