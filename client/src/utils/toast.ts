/**
 * Lightweight toast notification utility — no external dependency.
 * Colors are read from CSS variables at show-time so toasts follow the active theme.
 * Usage: toast.success('Done!') | toast.error('Failed!') | toast.warning('Note') | toast.info('Note')
 */

type ToastType = 'success' | 'error' | 'info' | 'warning';

const STATUS_VARS: Record<ToastType, string> = {
  success: '--status-success-text',
  error:   '--status-error-text',
  info:    '--status-info-text',
  warning: '--status-warning-text',
};

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
  warning: '⚠',
};

function getCSSVar(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

let container: HTMLDivElement | null = null;

function getContainer(): HTMLDivElement {
  if (!container || !document.body.contains(container)) {
    container = document.createElement('div');
    container.id = 'nexus-toast-root';
    Object.assign(container.style, {
      position: 'fixed',
      top: '24px',
      right: '24px',
      zIndex: '99999',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none',
    });
    document.body.appendChild(container);
  }
  return container;
}

function show(message: string, type: ToastType = 'info', duration = 3500): string {
  const c = getContainer();
  const el = document.createElement('div');
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  el.dataset.toastId = id;

  // Read theme-aware colors at show time
  const color = getCSSVar(STATUS_VARS[type], '#6366f1');
  const bg    = getCSSVar('--bg-card', '#0D1E2E');
  const text  = getCSSVar('--text-primary', '#EDF5FB');
  const muted = getCSSVar('--text-muted', '#3E6880');
  const icon  = ICONS[type];

  Object.assign(el.style, {
    background: bg,
    border: `1px solid ${color}40`,
    borderLeft: `3px solid ${color}`,
    borderRadius: '12px',
    padding: '12px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: '260px',
    maxWidth: '380px',
    boxShadow: getCSSVar('--shadow-md', '0 8px 32px rgba(0,0,0,0.4)'),
    pointerEvents: 'all',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    opacity: '0',
    transform: 'translateX(20px)',
    fontFamily: 'Inter, system-ui, sans-serif',
  });

  el.innerHTML = `
    <span style="color:${color};font-weight:900;font-size:14px;flex-shrink:0">${icon}</span>
    <span style="color:${text};font-size:13px;font-weight:600;line-height:1.4">${message}</span>
    <span style="margin-left:auto;color:${muted};font-size:18px;cursor:pointer;flex-shrink:0" onclick="this.parentElement.remove()">×</span>
  `;

  c.appendChild(el);

  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateX(0)';
  });

  const timer = duration > 0 ? window.setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    window.setTimeout(() => el.remove(), 250);
  }, duration) : null;

  el.onclick = () => {
    if (timer !== null) window.clearTimeout(timer);
    el.remove();
  };
  return id;
}

function dismiss(id?: string) {
  if (!container) return;
  if (!id) {
    container.replaceChildren();
    return;
  }
  Array.from(container.children).find((node) => (node as HTMLElement).dataset.toastId === id)?.remove();
}

export const toast = {
  success: (msg: string, duration?: number) => show(msg, 'success', duration),
  error:   (msg: string, duration?: number) => show(msg, 'error', duration),
  info:    (msg: string, duration?: number) => show(msg, 'info', duration),
  warning: (msg: string, duration?: number) => show(msg, 'warning', duration),
  loading: (msg: string) => show(msg, 'info', 0),
  dismiss,
};
