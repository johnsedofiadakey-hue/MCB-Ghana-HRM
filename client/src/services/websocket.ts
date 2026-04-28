import { useEffect, useRef, useState, useCallback } from 'react';

export interface WSNotification {
  id: string; title: string; message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  link?: string; isRead: boolean; createdAt: string;
}

const deriveWsUrl = () => {
  const explicit = import.meta.env.VITE_WS_URL;
  if (explicit) {
    // Ensure the explicit URL ends with /ws
    const base = explicit.trim().replace(/\/+$/, '');
    return base.endsWith('/ws') ? base : `${base}/ws`;
  }

  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    const wsBase = apiUrl.replace('https://', 'wss://').replace('http://', 'ws://').replace(/\/api\/?$/, '');
    return `${wsBase}/ws`;
  }

  return 'wss://mcb-ghana-hrm-api.onrender.com/ws';
};

const WS_URL = deriveWsUrl();

export const useWebSocket = (onMessage?: (type: string, data: any) => void) => {
  const ws = useRef<WebSocket | null>(null);
  const [notifications, setNotifications] = useState<WSNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    const token = localStorage.getItem('nexus_auth_token');
    if (!token) return;

    ws.current = new WebSocket(`${WS_URL}?token=${token}`);

    ws.current.onopen = () => {
      setConnected(true);
      console.log('[WS] Connected');
    };

    ws.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        // Pass to custom listener if provided
        if (onMessage) onMessage(msg.type, msg.data || msg);

        if (msg.type === 'NOTIFICATION') {
          setNotifications(prev => [msg.data, ...prev]);
          setUnreadCount(c => c + 1);
          showToast(msg.data);
        }

        if (msg.type === 'PENDING_NOTIFICATIONS') {
          setNotifications(msg.data);
          setUnreadCount(msg.data.filter((n: WSNotification) => !n.isRead).length);
        }
      } catch (e) {}
    };

    ws.current.onclose = () => {
      setConnected(false);
      // Auto-reconnect after 5 seconds
      setTimeout(connect, 5000);
    };

    ws.current.onerror = () => ws.current?.close();
  }, []);

  useEffect(() => {
    connect();
    return () => { ws.current?.close(); };
  }, [connect]);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  return { notifications, unreadCount, connected, markAllRead };
};

// Global toast system
const showToast = (notification: WSNotification) => {
  const colors: Record<string, string> = {
    SUCCESS: '#10b981', ERROR: '#f43f5e', WARNING: '#f59e0b', INFO: '#6366f1'
  };
  const icons: Record<string, string> = { SUCCESS: '✓', ERROR: '✕', WARNING: '⚠', INFO: 'ℹ' };

  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    display:flex;align-items:flex-start;gap:12px;
    background:#1e293b;border:1px solid rgba(99,102,241,0.3);
    border-left:4px solid ${colors[notification.type] || '#6366f1'};
    border-radius:12px;padding:14px 18px;max-width:360px;
    box-shadow:0 20px 60px rgba(0,0,0,0.5);
    animation:slideIn 0.3s ease;font-family:'DM Sans',sans-serif;
  `;

  const style = document.createElement('style');
  style.textContent = `@keyframes slideIn{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}`;
  document.head.appendChild(style);

  toast.innerHTML = `
    <div style="width:28px;height:28px;border-radius:50%;background:${colors[notification.type]}20;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:${colors[notification.type]};font-size:14px;font-weight:700">${icons[notification.type] || 'ℹ'}</div>
    <div style="flex:1">
      <p style="margin:0 0 2px;font-weight:600;color:#f1f5f9;font-size:13px">${notification.title}</p>
      <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.4">${notification.message}</p>
    </div>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#64748b;cursor:pointer;font-size:16px;padding:0;line-height:1;flex-shrink:0">×</button>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
};
