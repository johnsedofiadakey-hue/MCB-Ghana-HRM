import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command, Search } from 'lucide-react';

const COMMANDS = [
  { label: 'Go to Dashboard', to: '/dashboard' },
  { label: 'Open Attendance', to: '/attendance' },
  { label: 'Open Payroll', to: '/payroll' },
  { label: 'Open Enterprise Suite', to: '/enterprise' },
  { label: 'Open Employees', to: '/employees' },
  { label: 'Open Org Chart', to: '/orgchart' },
  { label: 'Open Admin Settings', to: '/settings' },
];

const CommandPalette = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (k === 'escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return COMMANDS;
    const q = query.toLowerCase();
    return COMMANDS.filter((item) => item.label.toLowerCase().includes(q));
  }, [query]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden md:flex fixed bottom-5 right-5 z-40 items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] shadow-lg"
      >
        <Command size={14} />
        Quick Actions
        <span className="rounded bg-[var(--bg-main)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">Ctrl/⌘ K</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm p-4 flex items-start md:items-center justify-center" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl nx-card p-4 md:p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <Search size={16} className="text-[var(--primary)]" />
          <input
            autoFocus
            className="nx-input"
            placeholder="Search pages and quick actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="space-y-2 max-h-[55vh] overflow-auto custom-scrollbar">
          {filtered.map((item) => (
            <button
              key={item.to}
              className="w-full text-left p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] hover:bg-[var(--primary)]/10 hover:border-[var(--primary)]/40 text-sm text-[var(--text-primary)] transition-all"
              onClick={() => {
                setOpen(false);
                navigate(item.to);
              }}
            >
              {item.label}
            </button>
          ))}
          {filtered.length === 0 ? <p className="text-sm text-[var(--text-muted)] px-2 py-3">No results found.</p> : null}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
