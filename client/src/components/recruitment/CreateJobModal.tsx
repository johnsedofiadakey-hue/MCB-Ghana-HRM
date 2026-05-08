import React, { useState, useEffect } from 'react';
import PulseModal from '../common/PulseModal';
import { Briefcase, MapPin, Building2, Clock, ChevronRight, Save } from 'lucide-react';
import api from '../../services/api';
import { motion } from 'framer-motion';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateJobModal = ({ isOpen, onClose, onSuccess }: CreateJobModalProps) => {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: '',
    departmentId: '',
    location: '',
    employmentType: 'FULL_TIME',
    description: ''
  });

  useEffect(() => {
    if (isOpen) fetchDepartments();
  }, [isOpen]);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/recruitment/jobs', {
        ...form,
        departmentId: form.departmentId ? Number(form.departmentId) : undefined
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PulseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Opening"
      subtitle="Define a new position in your talent pipeline"
      icon={Briefcase}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Position Title</label>
          <div className="relative group">
            <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
            <input 
              required
              placeholder="e.g. Senior Software Engineer"
              className="nx-input pl-12"
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Department</label>
             <div className="relative group">
               <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
               <select 
                 className="nx-input pl-12 appearance-none"
                 value={form.departmentId}
                 onChange={e => setForm({...form, departmentId: e.target.value})}
               >
                 <option value="" className="bg-[var(--bg-card)]">Select Department</option>
                 {departments.map(d => <option key={d.id} value={d.id} className="bg-[var(--bg-card)]">{d.name}</option>)}
               </select>
             </div>
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Location</label>
             <div className="relative group">
               <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
               <input 
                 placeholder="e.g. Remote / Accra, Ghana"
                 className="nx-input pl-12"
                 value={form.location}
                 onChange={e => setForm({...form, location: e.target.value})}
               />
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Employment Type</label>
              <div className="flex gap-2 p-1.5 rounded-2xl bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)]">
                 {['FULL_TIME', 'PART_TIME', 'CONTRACT'].map(type => (
                   <button
                     key={type}
                     type="button"
                     onClick={() => setForm({...form, employmentType: type})}
                     className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                       form.employmentType === type 
                         ? "bg-[var(--primary)] text-white shadow-lg" 
                         : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                     }`}
                   >
                     {type.replace('_', ' ')}
                   </button>
                 ))}
              </div>
           </div>
           <div className="p-4 rounded-2xl bg-[var(--bg-elevated)]/30 border border-dashed border-[var(--border-subtle)] flex items-center gap-3">
              <Clock size={16} className="text-[var(--primary)]" />
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tight">Active for public listing once saved</p>
           </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Description & Requirements</label>
          <textarea 
            rows={4}
            placeholder="Outline the role expectations, key responsibilities and required skills..."
            className="nx-input min-h-[120px] py-4"
            value={form.description}
            onChange={e => setForm({...form, description: e.target.value})}
          />
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border-subtle)]">
          <button 
            type="button" 
            onClick={onClose}
            className="px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Review Later
          </button>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className="px-10 py-4 bg-[var(--primary)] text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] shadow-xl shadow-[var(--primary)]/20 flex items-center gap-2"
          >
            {loading ? "Syncing..." : <><Save size={16} /> Post Opening</>}
          </motion.button>
        </div>
      </form>
    </PulseModal>
  );
};

export default CreateJobModal;
