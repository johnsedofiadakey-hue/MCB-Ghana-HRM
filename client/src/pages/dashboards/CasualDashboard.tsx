import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Clock, Calendar, FileText, ChevronRight } from 'lucide-react';
import { getStoredUser } from '../../utils/session';
import ActionInbox from '../../components/dashboard/ActionInbox';

const CasualDashboard: React.FC = () => {
  const user = getStoredUser();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-10 page-transition pb-10">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <p className="text-sm font-bold uppercase tracking-widest text-primary-light mb-1">{greeting}</p>
        <h1 className="font-display font-black text-4xl text-white leading-none">
          {user.name?.split(' ')[0] || 'Worker'} <span className="gradient-text">Portal</span>
        </h1>
        <p className="text-slate-400 mt-2 text-sm font-medium">
          {user.jobTitle || 'Casual Worker'} &nbsp;·&nbsp; Employee Self-Service
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <ActionInbox />
        </div>
        <div className="lg:col-span-2">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass p-8 h-full flex flex-col justify-center">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/20">
                <User size={20} className="text-[var(--primary)]" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-white">{user.name || 'Employee'}</h3>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">{user.jobTitle || 'Casual Worker'}</p>
              </div>
            </div>
            <div className="space-y-2">
               <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Employment Type</span>
                  <span className="text-white font-bold text-[10px] uppercase tracking-widest">Casual</span>
               </div>
               <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Access Level</span>
                  <span className="text-primary font-black text-[10px] uppercase tracking-widest">Staff Portal</span>
               </div>
            </div>
          </motion.div>
        </div>
      </div>

        {/* Attendance Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass p-8 space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-[var(--success)]/10 border border-[var(--success)]/20">
              <Clock size={20} className="text-[var(--success)]" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">Attendance Tracking</h3>
              <p className="text-xs text-[var(--success)] uppercase tracking-widest font-bold">System Active</p>
            </div>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Ensure you clock in every day through the attendance portal to accurately record your working hours.
          </p>
          <Link to="/attendance" className="block w-full py-3 text-center font-black text-sm text-white rounded-2xl bg-[var(--primary)]/80 hover:bg-[var(--primary)] transition-all">
            Clock In / Out
          </Link>
        </motion.div>

      {/* Self-service Links */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass p-8">
        <h3 className="font-display font-bold text-xl text-white mb-6">Self-Service</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Request Leave', href: '/leave', icon: Calendar, desc: 'Submit a time-off request' },
            { label: 'My Documents', href: '/profile', icon: FileText, desc: 'Contracts and certificates' },
            { label: 'Training Programs', href: '/training', icon: Clock, desc: 'Available courses for you' },
            { label: 'My Profile', href: '/profile', icon: User, desc: 'View and update your info' },
          ].map((item, i) => (
            <Link key={i} to={item.href}
              className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-primary/20 transition-all group">
              <div className="p-2.5 rounded-xl bg-[var(--primary)]/10">
                <item.icon size={16} className="text-[var(--primary)]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white group-hover:text-primary-light transition-colors">{item.label}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
              <ChevronRight size={14} className="text-slate-600 group-hover:text-primary-light transition-colors" />
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
export default CasualDashboard;
