import React from 'react';
import { useNavigate , Link} from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Target, Activity, Clock, ChevronRight } from 'lucide-react';
import { getStoredUser } from '../../utils/session';
import ActionInbox from '../../components/dashboard/ActionInbox';

const MidManagerDashboard: React.FC = () => {
  const user = getStoredUser();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const milestones = [
    { name: 'Direct Sales', progress: 72, color: 'var(--primary)' },
    { name: 'Customer Tickets', progress: 89, color: 'var(--success)' },
    { name: 'Training Completion', progress: 45, color: 'var(--error)' },
    { name: 'Product Knowledge', progress: 61, color: 'var(--warning)' },
  ];

  return (
    <div className="space-y-8 pb-20 page-transition">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm font-bold uppercase tracking-widest text-primary-light mb-1">{greeting}</p>
        <h1 className="font-display font-black text-4xl text-white leading-none">
          {user.name?.split(' ')[0] || 'Lead'} <span className="gradient-text">Operations</span>
        </h1>
        <p className="text-slate-400 mt-2 text-sm font-medium">
          {user.jobTitle || 'Team Lead'} &nbsp;·&nbsp; Operational Excellence
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <ActionInbox />
        </div>
        <div className="lg:col-span-2 grid grid-cols-2 gap-5 h-fit">
          {[
            { label: 'Active Team Targets', value: '8', icon: Target, color: 'var(--primary)' },
            { label: 'Pending Reviews', value: '3', icon: Activity, color: 'var(--success)' },
            { label: 'Team Attendance', value: '94%', icon: Clock, color: 'var(--warning)' },
            { label: 'Reporting Staff', value: '6', icon: Users, color: 'var(--accent)' },
          ].map((s, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}
              className="glass p-6 group hover:border-primary/30 transition-all">
              <div className="w-10 h-10 rounded-2xl mb-4 flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ background: `${s.color}15`, color: s.color }}>
                <s.icon size={18} />
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.label}</p>
              <h4 className="text-2xl font-black text-white mt-1">{s.value}</h4>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass p-8">
          <h3 className="font-display font-bold text-xl text-white mb-6">Team Milestone Progress</h3>
          <div className="space-y-6">
            {milestones.map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-center mb-2 text-sm font-bold">
                  <span className="text-slate-400 uppercase tracking-widest text-[11px]">{item.name}</span>
                  <span style={{ color: item.color }}>{item.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ background: item.color }}
                    initial={{ width: 0 }} animate={{ width: `${item.progress}%` }} transition={{ delay: 0.5 + idx * 0.1, duration: 0.8 }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="glass p-8">
          <h3 className="font-display font-bold text-xl text-white mb-6">Team Actions</h3>
          <div className="space-y-3">
            {[
              { label: 'Submit KPI Progress', href: '/team-targets', urgent: false },
              { label: 'Approve Leave Requests', href: '/leave', urgent: true },
              { label: 'View My Appraisal', href: '/performance-reviews', urgent: false },
              { label: 'Team Attendance', href: '/attendance', urgent: false },
            ].map((item, i) => (
              <Link key={i} to={item.href}
                className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-primary/20 transition-all no-underline group">
                <span className={`text-sm font-bold ${item.urgent ? 'text-amber-400' : 'text-slate-300'} group-hover:text-white transition-colors`}>{item.label}</span>
                <ChevronRight size={14} className="text-slate-600 group-hover:text-primary-light transition-colors" />
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
export default MidManagerDashboard;
