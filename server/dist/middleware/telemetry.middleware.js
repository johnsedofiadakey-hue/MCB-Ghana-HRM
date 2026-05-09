"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiUsageMiddleware = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const logBuffer = [];
const BATCH_SIZE = 50;
const FLUSH_INTERVAL = 30000; // 30 seconds
const flushLogs = async () => {
    if (logBuffer.length === 0)
        return;
    const logsToFlush = [...logBuffer];
    logBuffer.length = 0; // Clear buffer
    try {
        // 🛡️ PERFORMANCE FIX: Batch write logs to the database
        await client_1.default.apiUsage.createMany({
            data: logsToFlush,
            skipDuplicates: true
        });
    }
    catch (error) {
        console.error('[Telemetry Batch Flush Error]:', error);
    }
};
// Periodic flush
setInterval(flushLogs, FLUSH_INTERVAL);
const apiUsageMiddleware = async (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const user = req.user;
        logBuffer.push({
            organizationId: user?.organizationId || 'PUBLIC',
            method: req.method,
            path: req.baseUrl + req.path,
            statusCode: res.statusCode,
            duration: duration,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
        });
        if (logBuffer.length >= BATCH_SIZE) {
            flushLogs();
        }
    });
    next();
};
exports.apiUsageMiddleware = apiUsageMiddleware;
