import React, { useRef, useState } from 'react';
import PulseModal from '../common/PulseModal';
import { LifeBuoy, FileQuestion, Layers, AlertTriangle, Send, Paperclip, X } from 'lucide-react';
import api from '../../services/api';
import { motion } from 'framer-motion';
import { toast } from '../../utils/toast';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_ATTACHMENT_BYTES = 6 * 1024 * 1024; // 6MB — stays comfortably under the 10mb JSON body limit once base64-encoded

const CreateTicketModal = ({ isOpen, onClose, onSuccess }: CreateTicketModalProps) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    subject: '',
    category: 'IT',
    priority: 'NORMAL',
    description: ''
  });
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File | null) => {
    if (file && file.size > MAX_ATTACHMENT_BYTES) {
      toast.error('Attachment is too large — please keep it under 6MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setAttachFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let attachmentData: { fileBase64: string; fileName: string; mimeType: string } | undefined;
      if (attachFile) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Could not read attachment'));
          reader.readAsDataURL(attachFile);
        });
        attachmentData = { fileBase64: base64, fileName: attachFile.name, mimeType: attachFile.type };
      }

      await api.post('/support/tickets', { ...form, attachmentData });
      setForm({ subject: '', category: 'IT', priority: 'NORMAL', description: '' });
      setAttachFile(null);
      toast.success('Support ticket created');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Could not create support ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PulseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Ticket"
      subtitle="Briefly describe the issue for support"
      icon={LifeBuoy}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Ticket Subject</label>
          <div className="relative group">
            <FileQuestion size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
            <input 
              required
              placeholder="e.g. Printer Offline / Payroll Query / VPN Issue"
              className="nx-input nx-input-l"
              value={form.subject}
              onChange={e => setForm({...form, subject: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Support Category</label>
             <div className="relative group">
               <Layers size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
               <select 
                 className="nx-input nx-input-l appearance-none"
                 value={form.category}
                 onChange={e => setForm({...form, category: e.target.value})}
               >
                 {['IT', 'HR', 'FINANCE', 'MARKETING', 'FACILITIES', 'OTHER'].map(cat => (
                   <option key={cat} value={cat} className="bg-[var(--bg-card)]">{cat} SUPPORT</option>
                 ))}
               </select>
             </div>
          </div>

          <div className="space-y-2">
             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Priority Level</label>
             <div className="relative group">
               <AlertTriangle size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
               <select 
                 className="nx-input nx-input-l appearance-none"
                 value={form.priority}
                 onChange={e => setForm({...form, priority: e.target.value})}
               >
                 {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map(p => (
                   <option key={p} value={p} className="bg-[var(--bg-card)]">{p} PRIORITY</option>
                 ))}
               </select>
             </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Elaborate on the issue</label>
          <textarea 
            required
            rows={4}
            placeholder="Please provide specifics (e.g., error codes, screenshots URL, specific dates) to help us resolve the issue faster..."
            className="nx-input min-h-[140px] py-4"
            value={form.description}
            onChange={e => setForm({...form, description: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Attachment (optional)</label>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={e => handleFileSelect(e.target.files?.[0] || null)} />
          {attachFile ? (
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              <span className="flex items-center gap-2 text-[11px] font-bold text-[var(--text-secondary)] truncate">
                <Paperclip size={14} className="text-[var(--primary)] flex-shrink-0" /> {attachFile.name}
              </span>
              <button type="button" onClick={() => { setAttachFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-[var(--text-muted)] hover:text-[var(--error)] transition-colors flex-shrink-0">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)]/40 transition-colors"
            >
              <Paperclip size={14} /> Attach a screenshot or document
            </button>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Discard
          </button>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className="px-10 py-4 bg-[var(--primary)] text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] shadow-xl shadow-[var(--primary)]/20 flex items-center gap-2"
          >
            {loading ? "Engaging Support..." : <><Send size={16} /> Open Ticket</>}
          </motion.button>
        </div>
      </form>
    </PulseModal>
  );
};

export default CreateTicketModal;
