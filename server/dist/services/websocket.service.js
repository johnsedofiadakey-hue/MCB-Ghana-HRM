"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyAdmins = exports.notify = exports.broadcastToAll = exports.broadcastToRole = exports.pushToUser = exports.initWebSocket = void 0;
const ws_1 = require("ws");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = __importDefault(require("../prisma/client"));
const email_service_1 = require("./email.service");
let wss = null;
// Support multiple simultaneous connections per user (e.g. multiple browser tabs)
const clients = new Map();
const initWebSocket = (server) => {
    wss = new ws_1.WebSocketServer({ server, path: '/ws' });
    wss.on('connection', (ws, req) => {
        const url = new URL(req.url || '', `http://localhost`);
        const token = url.searchParams.get('token');
        if (!token) {
            ws.close(4001, 'Unauthorized');
            return;
        }
        try {
            const JWT_SECRET = process.env.JWT_SECRET;
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            ws.userId = decoded.id;
            ws.role = decoded.role;
            ws.isAlive = true;
            // Add to this user's connection set (don't overwrite other tabs)
            if (!clients.has(decoded.id))
                clients.set(decoded.id, new Set());
            clients.get(decoded.id).add(ws);
            console.log(`[WS] Connected: ${decoded.id} (${decoded.role}) — ${clients.get(decoded.id).size} tab(s)`);
            ws.on('pong', () => { ws.isAlive = true; });
            ws.on('close', () => {
                if (ws.userId) {
                    const set = clients.get(ws.userId);
                    if (set) {
                        set.delete(ws);
                        if (set.size === 0)
                            clients.delete(ws.userId);
                    }
                }
                console.log(`[WS] Disconnected: ${ws.userId}`);
            });
            ws.on('error', console.error);
            sendPendingNotifications(decoded.id);
        }
        catch (e) {
            ws.close(4001, 'Invalid token');
        }
    });
    const interval = setInterval(() => {
        wss?.clients.forEach((ws) => {
            if (!ws.isAlive) {
                ws.terminate();
                return;
            }
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);
    wss.on('close', () => clearInterval(interval));
    console.log('[WS] WebSocket server initialized');
};
exports.initWebSocket = initWebSocket;
const sendPendingNotifications = async (userId) => {
    try {
        const unread = await client_1.default.notification.findMany({
            where: { userId, isRead: false },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        if (unread.length > 0) {
            (0, exports.pushToUser)(userId, { type: 'PENDING_NOTIFICATIONS', data: unread });
        }
    }
    catch (e) { }
};
const pushToUser = (userId, payload) => {
    const set = clients.get(userId);
    if (!set || set.size === 0)
        return false;
    const msg = JSON.stringify(payload);
    let sent = false;
    set.forEach(ws => {
        if (ws.readyState === ws_1.WebSocket.OPEN) {
            ws.send(msg);
            sent = true;
        }
    });
    return sent;
};
exports.pushToUser = pushToUser;
const broadcastToRole = (role, payload) => {
    const msg = JSON.stringify(payload);
    clients.forEach(set => {
        set.forEach(ws => {
            if (ws.role === role && ws.readyState === ws_1.WebSocket.OPEN) {
                ws.send(msg);
            }
        });
    });
};
exports.broadcastToRole = broadcastToRole;
const broadcastToAll = (payload) => {
    const msg = JSON.stringify(payload);
    clients.forEach(set => {
        set.forEach(ws => {
            if (ws.readyState === ws_1.WebSocket.OPEN)
                ws.send(msg);
        });
    });
};
exports.broadcastToAll = broadcastToAll;
const notify = async (userId, title, message, type = 'INFO', link, shouldSendEmail = true) => {
    try {
        const user = await client_1.default.user.findUnique({
            where: { id: userId },
            select: { email: true, status: true },
        });
        const notification = await client_1.default.notification.create({
            data: { userId, title, message, type, link },
        });
        (0, exports.pushToUser)(userId, { type: 'NOTIFICATION', data: notification });
        if (shouldSendEmail && user?.email && user.status === 'ACTIVE') {
            email_service_1.EmailService.sendNotification(user.email, title, message, link);
        }
        return notification;
    }
    catch (e) {
        console.error('[WS] Notify failed:', e);
    }
};
exports.notify = notify;
const notifyAdmins = async (title, message, type = 'INFO') => {
    try {
        const admins = await client_1.default.user.findMany({
            where: { role: { in: ['MD', 'DIRECTOR', 'MANAGER', 'IT_MANAGER', 'HR_OFFICER'] }, status: 'ACTIVE' },
            select: { id: true },
        });
        await Promise.all(admins.map(admin => (0, exports.notify)(admin.id, title, message, type)));
    }
    catch (e) { }
};
exports.notifyAdmins = notifyAdmins;
