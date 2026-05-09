import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Users, Target, AlertTriangle, Shield } from 'lucide-react';
import api from '../../services/api';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useTranslation } from 'react-i18next';
import { toast } from '../../utils/toast';

interface AnalyticsData {
  headcount: number;
  avgPerformance: number;
  leaveUtilization: number;
  attritionRiskNodes: number;
  leaveAbuseSignals: number;
}

const PredictiveAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [metricsRes, signalsRes] = await Promise.all([
        api.get('/analytics/metrics'),
        api.get('/analytics/signals')
      ]);
      
      const metrics = metricsRes.data;
      const signals = signalsRes.data;

      setData({
        headcount: metrics.headcount || 0,
        avgPerformance: metrics.avgPerformance || 0,
        leaveUtilization: metrics.leaveUtilization || 0,
        attritionRiskNodes: signals.attritionRisk?.length || 0,
        leaveAbuseSignals: signals.potentialLeaveAbuse?.length || 0
      });
    } catch (err) {
      console.error('Failed to fetch analytics');
      toast.error('Failed to fetch analytics data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto page-enter p-6">
      <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
        <div className="flex items-center gap-3 mb-3">
           <div className="px-3 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[10px] font-black text-[var(--primary)] uppercase tracking-widest flex items-center gap-2">
              <BarChart3 size={12} className="animate-pulse" /> Decision Intelligence
           </div>
           <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
           <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Predictive Layer</span>
        </div>
        <h1 className="font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[var(--text-primary)] tracking-tight leading-none">
          Predictive Analytics <span className="text-[var(--text-muted)] font-thin block xs:inline lg:ml-2">/ Intelligence</span>
        </h1>
        <p className="text-[14px] font-medium mt-4 text-[var(--text-secondary)] opacity-70 max-w-2xl leading-relaxed">
          Anticipate trends, identify risks, and optimize organizational velocity through machine-assisted signals.
        </p>
      </motion.div>

      {loading && !data ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-40 italic">
          <div className="w-10 h-10 border-2 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin mb-4" />
          <p className="text-[10px] uppercase font-black tracking-widest">Processing telemetry...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Metrics */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="nx-card p-8 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)]">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
                  <Users size={24} />
                </div>
                <span className="text-emerald-500 text-xs font-bold flex items-center gap-1">
                  <TrendingUp size={12} /> +4%
                </span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Active Headcount</p>
              <h3 className="text-5xl font-black text-[var(--text-primary)] mt-2">{data?.headcount || 0}</h3>
              <p className="text-[11px] font-medium text-[var(--text-secondary)] mt-4 opacity-70">
                Total personnel across all active domains.
              </p>
            </div>

            <div className="nx-card p-8 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)]">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                  <Target size={24} />
                </div>
                <span className="text-emerald-500 text-xs font-bold flex items-center gap-1">
                  <TrendingUp size={12} /> +1.2
                </span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Average Performance</p>
              <h3 className="text-5xl font-black text-[var(--text-primary)] mt-2">{data?.avgPerformance || 0}%</h3>
              <p className="text-[11px] font-medium text-[var(--text-secondary)] mt-4 opacity-70">
                Normalized score across current appraisal cycles.
              </p>
            </div>
          </div>

          {/* Predictive Signals */}
          <div className="lg:col-span-4 space-y-6">
            <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Predictive Signals</h3>
            
            <div className="nx-card p-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-rose-500/30 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <p className="text-2xl font-black text-[var(--text-primary)]">{data?.attritionRiskNodes || 0}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">High Attrition Risk Nodes</p>
                </div>
              </div>
              <p className="text-[11px] font-medium text-[var(--text-secondary)] mt-4 opacity-70">
                Heuristics detect unusual patterns in feedback and check-ins.
              </p>
            </div>

            <div className="nx-card p-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-amber-500/30 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                  <Shield size={24} />
                </div>
                <div>
                  <p className="text-2xl font-black text-[var(--text-primary)]">{data?.leaveAbuseSignals || 0}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Anomaly Detection Signals</p>
                </div>
              </div>
              <p className="text-[11px] font-medium text-[var(--text-secondary)] mt-4 opacity-70">
                Pattern matching on leave sequences and unplanned absences.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictiveAnalytics;
