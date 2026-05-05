"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActivityLogs = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const getActivityLogs = async (req, res) => {
    try {
        const limit = Number(req.query.limit) || 10;
        const logs = await client_1.default.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: Math.min(limit, 50),
            include: { user: { select: { fullName: true, email: true } } }
        });
        const payload = logs.map((log) => ({
            id: log.id,
            user: log.user?.fullName || log.user?.email || 'System',
            action: log.action || 'Updated',
            target: log.entity || 'System',
            time: log.createdAt.toLocaleString('en-US', { month: 'short', day: 'numeric' })
        }));
        res.json(payload);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getActivityLogs = getActivityLogs;
