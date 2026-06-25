import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client';
import { EmailService } from './email.service';

interface AuthenticatedWS extends WebSocket {
  userId?: string;
  role?: string;
  isAlive?: boolean;
}

let wss: WebSocketServer | null = null;
// Support multiple simultaneous connections per user (e.g. multiple browser tabs)
const clients = new Map<string, Set<AuthenticatedWS>>();

export const initWebSocket = (server: any) => {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: AuthenticatedWS, req: IncomingMessage) => {
    const url = new URL(req.url || '', `http://localhost`);
    const token = url.searchParams.get('token');

    if (!token) { ws.close(4001, 'Unauthorized'); return; }

    try {
      const JWT_SECRET = process.env.JWT_SECRET!;
      const decoded: any = jwt.verify(token, JWT_SECRET);
      ws.userId = decoded.id;
      ws.role = decoded.role;
      ws.isAlive = true;

      // Add to this user's connection set (don't overwrite other tabs)
      if (!clients.has(decoded.id)) clients.set(decoded.id, new Set());
      clients.get(decoded.id)!.add(ws);
      console.log(`[WS] Connected: ${decoded.id} (${decoded.role}) — ${clients.get(decoded.id)!.size} tab(s)`);

      ws.on('pong', () => { ws.isAlive = true; });

      ws.on('close', () => {
        if (ws.userId) {
          const set = clients.get(ws.userId);
          if (set) {
            set.delete(ws);
            if (set.size === 0) clients.delete(ws.userId);
          }
        }
        console.log(`[WS] Disconnected: ${ws.userId}`);
      });

      ws.on('error', console.error);

      sendPendingNotifications(decoded.id);

    } catch (e) {
      ws.close(4001, 'Invalid token');
    }
  });

  const interval = setInterval(() => {
    wss?.clients.forEach((ws: AuthenticatedWS) => {
      if (!ws.isAlive) { ws.terminate(); return; }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));
  console.log('[WS] WebSocket server initialized');
};

const sendPendingNotifications = async (userId: string) => {
  try {
    const unread = await prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    if (unread.length > 0) {
      pushToUser(userId, { type: 'PENDING_NOTIFICATIONS', data: unread });
    }
  } catch (e) {}
};

export const pushToUser = (userId: string, payload: any): boolean => {
  const set = clients.get(userId);
  if (!set || set.size === 0) return false;
  const msg = JSON.stringify(payload);
  let sent = false;
  set.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
      sent = true;
    }
  });
  return sent;
};

export const broadcastToRole = (role: string, payload: any) => {
  const msg = JSON.stringify(payload);
  clients.forEach(set => {
    set.forEach(ws => {
      if (ws.role === role && ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    });
  });
};

export const broadcastToAll = (payload: any) => {
  const msg = JSON.stringify(payload);
  clients.forEach(set => {
    set.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    });
  });
};

export const notify = async (
  userId: string,
  title: string,
  message: string,
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' = 'INFO',
  link?: string,
  shouldSendEmail: boolean = true
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, status: true },
    });

    const notification = await prisma.notification.create({
      data: { userId, title, message, type, link },
    });

    pushToUser(userId, { type: 'NOTIFICATION', data: notification });

    if (shouldSendEmail && user?.email && user.status === 'ACTIVE') {
      EmailService.sendNotification(user.email, title, message, link);
    }

    return notification;
  } catch (e) {
    console.error('[WS] Notify failed:', e);
  }
};

export const notifyAdmins = async (title: string, message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' = 'INFO') => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['MD', 'DIRECTOR', 'MANAGER', 'IT_MANAGER', 'HR_OFFICER'] }, status: 'ACTIVE' },
      select: { id: true },
    });
    await Promise.all(admins.map(admin => notify(admin.id, title, message, type)));
  } catch (e) {}
};
