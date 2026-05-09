import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, User, Send, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useTranslation } from 'react-i18next';

interface Feedback {
  id: string;
  providerId: string;
  receiverId: string;
  content: string;
  rating: number;
  createdAt: string;
  provider?: { fullName: string };
  receiver?: { fullName: string };
}

const Feedback360: React.FC = () => {
  const { t } = useTranslation();
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [receiverId, setReceiverId] = useState('');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(5);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const res = await api.get('/continuous-performance/feedback');
      setFeedbackList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/continuous-performance/feedback', {
        receiverId,
        content,
        rating: Number(rating)
      });
      setReceiverId('');
      setContent('');
      setRating(5);
      fetchFeedback();
    } catch (err) {
      console.error('Failed to submit feedback');
    }
  };

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto page-enter p-6">
      <div className="flex flex-col lg:flex-row justify-between items-end gap-6">
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[var(--text-primary)] tracking-tight leading-none">
            360° Feedback <span className="text-[var(--text-muted)] font-thin block xs:inline lg:ml-2">/ Continuous Performance</span>
          </h1>
          <p className="text-[14px] font-medium mt-4 text-[var(--text-secondary)] opacity-70 max-w-2xl leading-relaxed">
            Share constructive insights and recognize contributions across the organization.
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Area */}
        <div className="lg:col-span-4">
          <div className="nx-card p-8 bg-[var(--bg-elevated)] border border-[var(--primary)]/20 sticky top-24">
            <h3 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tight mb-6">Share Feedback</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-2">Recipient ID</label>
                <input 
                  type="text"
                  value={receiverId}
                  onChange={(e) => setReceiverId(e.target.value)}
                  className="nx-input w-full"
                  placeholder="Who are you reviewing?"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-2">Impact Rating (1-5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center border transition-all",
                        rating >= star 
                          ? "bg-[var(--primary)] text-white border-[var(--primary)]" 
                          : "bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-subtle)]"
                      )}
                    >
                      <Star size={16} fill={rating >= star ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-2">Observations & Insights</label>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="nx-input w-full h-32 resize-none"
                  placeholder="Be specific, constructive, and balanced..."
                  required
                />
              </div>
              <button type="submit" className="w-full py-4 rounded-xl bg-[var(--primary)] text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
                <Send size={14} /> Broadcast Feedback
              </button>
            </form>
          </div>
        </div>

        {/* List Area */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Recent Feedback Stream</h3>
            <span className="text-[10px] font-bold text-[var(--text-muted)] opacity-60">{feedbackList.length} Entries</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-40 italic">
              <div className="w-10 h-10 border-2 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin mb-4" />
              <p className="text-[10px] uppercase font-black tracking-widest">Aggregating stream...</p>
            </div>
          ) : feedbackList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40 bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border-subtle)]">
              <div className="w-20 h-20 rounded-[2.5rem] bg-[var(--bg-elevated)] flex items-center justify-center border border-[var(--border-subtle)]">
                <MessageSquare size={32} />
              </div>
              <div>
                <p className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">No Feedback Recorded</p>
                <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)]">Be the first to share insights</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {feedbackList.map((fb) => (
                <motion.div 
                  key={fb.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="nx-card p-6 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)] hover:shadow-xl hover:shadow-[var(--primary)]/5 transition-all relative overflow-hidden group"
                >
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center flex-shrink-0 border border-[var(--primary)]/20">
                      <User size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <h4 className="text-[14px] font-black tracking-tight text-[var(--text-primary)]">
                            {fb.receiver?.fullName || fb.receiverId}
                          </h4>
                          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                            From: {fb.provider?.fullName || fb.providerId}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-amber-500">
                          {Array.from({ length: fb.rating }).map((_, i) => (
                            <Star key={i} size={12} fill="currentColor" />
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] font-medium text-[var(--text-secondary)] mt-2 line-clamp-3 bg-[var(--bg-main)] p-3 rounded-lg border border-[var(--border-subtle)] italic">
                        "{fb.content}"
                      </p>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50">
                          {new Date(fb.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Feedback360;
