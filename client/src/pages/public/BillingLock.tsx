import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, AlertTriangle, LogOut } from 'lucide-react';
import { storage } from '../../services/storage';

const BillingLock: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    storage.clearSession();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-amber-200 bg-[var(--bg-card)] p-8 shadow-xl dark:border-amber-800">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <CreditCard className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-semibold uppercase tracking-widest text-amber-500">Subscription Required</span>
            </div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Account on hold</h1>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Your organisation's MCB Ghana HRM subscription has lapsed or requires attention.
              Please contact your administrator or our support team to restore access.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-main)] p-4 text-sm text-[var(--text-muted)] mb-6">
            <p className="font-medium text-[var(--text-primary)] mb-1">Need help?</p>
            <p>Email <a href="mailto:support@mcbghana.com" className="text-[var(--primary)] hover:underline">support@mcbghana.com</a> or reach out to your IT administrator to resolve the billing issue.</p>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] py-3 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)]"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillingLock;
