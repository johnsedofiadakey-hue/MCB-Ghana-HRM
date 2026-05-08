/**
 * Lightweight toast notification utility — no external dependency.
 * Usage: toast.success('Done!') | toast.error('Failed!') | toast.info('Note')
 */

type ToastType = 'success' | 'error' | 'info' | 'warning';

const COLORS: Record<ToastType, string> = {
  success: '#10b981',
  error:   '#f43f5e',
  info:    '#6366f1',
  warning: '#f59e0b',
};

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
  warning: '⚠',
};

let container: HTMLDivElement | null = null;

function getContainer(): HTMLDivElement {
  if (!container || !document.body.contains(container)) {
    container = document.createElement('div');
    container.id = 'nexus-toast-root';
    Object.assign(container.style, {
      position: 'fixed', top: '24px', right: '24px',
      zIndex: '99999', display: 'flex', flexDirection: 'column', gap: '8px',
      pointerEvents: 'none',
    });
    document.body.appendChild(container);
  }
  return container;
}

function show(message: string, type: ToastType = 'info', duration = 3500) {
  const c = getContainer();
  const el = document.createElement('div');
  const color = COLORS[type];
  const icon = ICONS[type];

  Object.assign(el.style, {
    background: '#0f172a',
    border: `1px solid ${color}40`,
    borderLeft: `3px solid ${color}`,
    borderRadius: '12px',
    padding: '12px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: '260px',
    maxWidth: '400px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    pointerEvents: 'all',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    opacity: '0',
    transform: 'translateX(20px)',
    fontFamily: 'system-ui, sans-serif',
  });

  el.innerHTML = `
    <span style="color:${color};font-weight:900;font-size:14px;flex-shrink:0">${icon}</span>
    <span style="color:#e2e8f0;font-size:13px;font-weight:600;line-height:1.4">${message}</span>
    <span style="margin-left:auto;color:#475569;font-size:18px;cursor:pointer;flex-shrink:0" onclick="this.parentElement.remove()">×</span>
  `;

  c.appendChild(el);

  // Animate in
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateX(0)';
  });

  // Auto-dismiss
  const timer = setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(() => el.remove(), 250);
  }, duration);

  el.onclick = () => { clearTimeout(timer); el.remove(); };
}

export const toast = {
  success: (msg: string, duration?: number) => show(msg, 'success', duration),
  error:   (msg: string, duration?: number) => show(msg, 'error', duration),
  info:    (msg: string, duration?: number) => show(msg, 'info', duration),
  warning: (msg: string, duration?: number) => show(msg, 'warning', duration),
};
