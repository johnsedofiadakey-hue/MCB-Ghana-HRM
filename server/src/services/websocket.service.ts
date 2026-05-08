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
const clients = new Map<string, AuthenticatedWS>(); // userId -> ws

export const initWebSocket = (server: any) => {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: AuthenticatedWS, req: IncomingMessage) => {
    // Auth via query param token
    const url = new URL(req.url || '', `http://localhost`);
    const token = url.searchParams.get('token');

    if (!token) { ws.close(4001, 'Unauthorized'); return; }

    try {
      const JWT_SECRET = process.env.JWT_SECRET!;
      const decoded: any = jwt.verify(token, JWT_SECRET);
      ws.userId = decoded.id;
      ws.role = decoded.role;
      ws.isAlive = true;

      // Register client
      clients.set(decoded.id, ws);
      console.log(`[WS] Connected: ${decoded.id} (${decoded.role})`);

      // Heartbeat
      ws.on('pong', () => { ws.isAlive = true; });

      ws.on('close', () => {
        if (ws.userId) clients.delete(ws.userId);
        console.log(`[WS] Disconnected: ${ws.userId}`);
      });

      ws.on('error', console.error);

      // Send pending notifications on connect
      sendPendingNotifications(decoded.id);

    } catch (e) {
      ws.close(4001, 'Invalid token');
    }
  });

  // Heartbeat interval
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
      take: 20
    });
    if (unread.length > 0) {
      pushToUser(userId, { type: 'PENDING_NOTIFICATIONS', data: unread });
    }
  } catch (e) {}
};

export const pushToUser = (userId: string, payload: any) => {
  const ws = clients.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
    return true;
  }
  return false;
};

export const broadcastToRole = (role: string, payload: any) => {
  clients.forEach((ws, _userId) => {
    if (ws.role === role && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  });
};

export const broadcastToAll = (payload: any) => {
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  });
};

// Create + push notification in one call
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
      select: { email: true, status: true }
    });

    // 1. Create DB notification
    const notification = await prisma.notification.create({
      data: { userId, title, message, type, link }
    });

    // 2. Push WebSocket (Real-time)
    pushToUser(userId, { type: 'NOTIFICATION', data: notification });

    // 3. Send Email (Async)
    if (shouldSendEmail && user?.email && user.status === 'ACTIVE') {
      EmailService.sendNotification(user.email, title, message, link);
    }

    return notification;
  } catch (e) {
    console.error('[WS] Notify failed:', e);
  }
};

// Notify all admins
export const notifyAdmins = async (title: string, message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' = 'INFO') => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['MD', 'DIRECTOR', 'MANAGER', 'IT_MANAGER', 'HR_OFFICER'] }, status: 'ACTIVE' },
      select: { id: true }
    });
<<<<<<< HEAD
    // 🛡️ PERFORMANCE FIX: Send notifications in parallel
    await Promise.all(admins.map(admin => notify(admin.id, title, message, type)));
=======
    for (const admin of admins) {
      await notify(admin.id, title, message, type);
    }
>>>>>>> 430a1da1a47c271c0801ba6d3e2fad6da5b864e7
  } catch (e) {}
};
