import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const ResetPassword: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setErrorMsg('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setErrorMsg('Passwords do not match.'); return; }
    if (!token) { setErrorMsg('Reset link is invalid or expired.'); return; }

    setStatus('loading');
    setErrorMsg('');
    try {
      await api.post('/auth/reset-password', { token, password });
      setStatus('success');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Reset failed. The link may have expired.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-xl">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-10)]">
              <Lock className="h-6 w-6 text-[var(--primary)]" />
            </div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Set new password</h1>
            <p className="text-sm text-[var(--text-muted)]">Choose a strong password for your account.</p>
          </div>

          {status === 'success' ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-[var(--text-primary)] font-medium">Password updated successfully.</p>
              <button
                onClick={() => navigate('/')}
                className="mt-2 w-full rounded-xl bg-[var(--primary)] py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                Go to login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="New password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 pr-10 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />

              {(status === 'error' || errorMsg) && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full rounded-xl bg-[var(--primary)] py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {status === 'loading' ? 'Updating…' : 'Update password'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-center text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
              >
                Back to login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
