"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotification = exports.markAllRead = exports.markReadParam = exports.getUnreadCount = exports.markRead = exports.getMyNotifications = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const getMyNotifications = async (req, res) => {
    try { // @ts-ignore
        const userId = req.user?.id;
        const unreadOnly = req.query.unread === 'true';
        const notifications = await client_1.default.notification.findMany({
            where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(notifications);
    }
    catch (err) {
        console.error('[notification.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.getMyNotifications = getMyNotifications;
const markRead = async (req, res) => {
    try { // @ts-ignore
        const userId = req.user?.id;
        const { ids } = req.body; // array of IDs, or empty = mark all
        await client_1.default.notification.updateMany({
            where: { userId, ...(ids?.length ? { id: { in: ids } } : {}) },
            data: { isRead: true }
        });
        res.json({ success: true });
    }
    catch (err) {
        console.error('[notification.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.markRead = markRead;
const getUnreadCount = async (req, res) => {
    try { // @ts-ignore
        const userId = req.user?.id;
        const count = await client_1.default.notification.count({ where: { userId, isRead: false } });
        res.json({ count });
    }
    catch (err) {
        console.error('[notification.controller.ts] getUnreadCount', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.getUnreadCount = getUnreadCount;
const markReadParam = async (req, res) => {
    try { // @ts-ignore
        const userId = req.user?.id;
        const { id } = req.params;
        await client_1.default.notification.update({
            where: { id, userId },
            data: { isRead: true }
        });
        res.json({ success: true });
    }
    catch (err) {
        console.error('[notification.controller.ts] markReadParam', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.markReadParam = markReadParam;
const markAllRead = async (req, res) => {
    try { // @ts-ignore
        const userId = req.user?.id;
        await client_1.default.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true }
        });
        res.json({ success: true });
    }
    catch (err) {
        console.error('[notification.controller.ts] markAllRead', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.markAllRead = markAllRead;
const deleteNotification = async (req, res) => {
    try { // @ts-ignore
        const userId = req.user?.id;
        const { id } = req.params;
        await client_1.default.notification.delete({
            where: { id, userId }
        });
        res.json({ success: true });
    }
    catch (err) {
        console.error('[notification.controller.ts] deleteNotification', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.deleteNotification = deleteNotification;
