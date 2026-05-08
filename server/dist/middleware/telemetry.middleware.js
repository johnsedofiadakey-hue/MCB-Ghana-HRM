"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiUsageMiddleware = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const apiUsageMiddleware = async (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const user = req.user;
        // Fire-and-forget: we don't await the DB write here to ensure zero impact on event loop responsiveness 
        client_1.default.apiUsage.create({
            data: {
                organizationId: user?.organizationId || 'PUBLIC',
                method: req.method,
                path: req.baseUrl + req.path,
                statusCode: res.statusCode,
                duration: duration,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            },
        }).catch((error) => {
            // Fail silently to not disrupt the main request flow
            console.error('[Telemetry Error]:', error);
        });
    });
    next();
};
exports.apiUsageMiddleware = apiUsageMiddleware;
