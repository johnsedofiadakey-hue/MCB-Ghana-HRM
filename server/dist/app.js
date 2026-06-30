"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// MCB HRM Ghana - Production Sync: 2026-04-26
const APP_VERSION = require('../package.json').version || '4.0.0';
console.log(`[Startup] ${new Date().toISOString()} - MCB HRM Ghana v${APP_VERSION} Initializing...`);
// 🚀 DEPLOYMENT HEARTBEAT: 2026-04-28T21:20:00Z
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const node_cron_1 = __importDefault(require("node-cron"));
const client_1 = __importDefault(require("./prisma/client"));
const maintenanceService = __importStar(require("./services/maintenance.service"));
const leave_balance_service_1 = require("./services/leave-balance.service");
const reminder_service_1 = require("./services/reminder.service");
const renewal_service_1 = require("./services/renewal.service");
const websocket_service_1 = require("./services/websocket.service");
const scheduler_service_1 = require("./services/scheduler.service");
const firebase_admin_1 = require("./services/firebase-admin");
// Initialize Firebase Admin (Phase 4 Agentic Integration)
(0, firebase_admin_1.initializeFirebase)();
const rate_limit_middleware_1 = require("./middleware/rate-limit.middleware");
const xss_sanitizer_middleware_1 = require("./middleware/xss-sanitizer.middleware");
// Routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const announcement_routes_1 = __importDefault(require("./routes/announcement.routes"));
const sub_unit_routes_1 = __importDefault(require("./routes/sub-unit.routes"));
const kpi_routes_1 = __importDefault(require("./routes/kpi.routes"));
const team_routes_1 = __importDefault(require("./routes/team.routes"));
const leave_routes_1 = __importDefault(require("./routes/leave.routes"));
const cycle_routes_1 = __importDefault(require("./routes/cycle.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const appraisal_routes_1 = __importDefault(require("./routes/appraisal.routes"));
const history_routes_1 = __importDefault(require("./routes/history.routes"));
const asset_routes_1 = __importDefault(require("./routes/asset.routes"));
const audit_routes_1 = __importDefault(require("./routes/audit.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const department_routes_1 = __importDefault(require("./routes/department.routes"));
const activity_routes_1 = __importDefault(require("./routes/activity.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const payroll_routes_1 = __importDefault(require("./routes/payroll.routes"));
const onboarding_routes_1 = __importDefault(require("./routes/onboarding.routes"));
const training_routes_1 = __importDefault(require("./routes/training.routes"));
const holiday_routes_1 = __importDefault(require("./routes/holiday.routes"));
const orgchart_routes_1 = __importDefault(require("./routes/orgchart.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const export_routes_1 = __importDefault(require("./routes/export.routes"));
const itadmin_routes_1 = __importDefault(require("./routes/itadmin.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const privacy_routes_1 = __importDefault(require("./routes/privacy.routes"));
const dev_routes_1 = __importDefault(require("./routes/dev.routes"));
const document_routes_1 = __importDefault(require("./routes/document.routes"));
const query_routes_1 = __importDefault(require("./routes/query.routes"));
const finance_routes_1 = __importDefault(require("./routes/finance.routes"));
const attendance_routes_1 = __importDefault(require("./routes/attendance.routes"));
const compensation_routes_1 = __importDefault(require("./routes/compensation.routes"));
const enterprise_routes_1 = __importDefault(require("./routes/enterprise.routes"));
const performance_v2_routes_1 = __importDefault(require("./routes/performance-v2.routes"));
const target_routes_1 = __importDefault(require("./routes/target.routes"));
const inbox_routes_1 = __importDefault(require("./routes/inbox.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const reporting_routes_1 = __importDefault(require("./routes/reporting.routes"));
const recruitment_routes_1 = __importDefault(require("./routes/recruitment.routes"));
const expense_routes_1 = __importDefault(require("./routes/expense.routes"));
const support_routes_1 = __importDefault(require("./routes/support.routes"));
const offboarding_routes_1 = __importDefault(require("./routes/offboarding.routes"));
const hrFeatures_routes_1 = __importDefault(require("./routes/hrFeatures.routes"));
const public_api_routes_1 = __importDefault(require("./routes/public-api.routes"));
const integrations_routes_1 = __importDefault(require("./routes/integrations.routes"));
const bot_routes_1 = __importDefault(require("./routes/bot.routes"));
const settings_routes_1 = __importDefault(require("./routes/settings.routes"));
const maintenance_routes_1 = __importDefault(require("./routes/maintenance.routes"));
const ai_routes_1 = __importDefault(require("./routes/ai.routes"));
const biometric_routes_1 = __importDefault(require("./routes/biometric.routes"));
const policy_routes_1 = __importDefault(require("./routes/policy.routes"));
const continuous_performance_routes_1 = __importDefault(require("./routes/continuous-performance.routes"));
const manager_cockpit_routes_1 = __importDefault(require("./routes/manager-cockpit.routes"));
const card_routes_1 = __importDefault(require("./routes/card.routes"));
const competency_routes_1 = __importDefault(require("./routes/competency.routes"));
const callCard_routes_1 = __importDefault(require("./routes/callCard.routes"));
// Config already loaded at top level
const validateConfig = () => {
    const required = ['JWT_SECRET', 'DATABASE_URL'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.error(`\n[FATAL] Missing mandatory environment variables:`);
        missing.forEach(m => console.error(` - ${m}`));
        console.error(`Please check your Render environment variables or production secrets.\n`);
        process.exit(1);
    }
    console.log('[Config] Environment variables verified.');
};
validateConfig();
const app = (0, express_1.default)();
app.set('trust proxy', 1);
// ─── INITIALIZE SERVER (Global Context) ────────────────────────────────────
const rawPort = process.env.PORT || '5000';
const PORT = parseInt(rawPort, 10);
const server = http_1.default.createServer(app);
const configuredOrigins = [
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    ...(process.env.CORS_ORIGINS || '').split(',')
].map(origin => origin?.trim()).filter(Boolean);
const allowedOrigins = Array.from(new Set([
    'https://mcb-hrm-ghana.web.app',
    'https://mcb-hrm-ghana.firebaseapp.com',
    'https://mcb-ghana-hrm-api.onrender.com',
    ...configuredOrigins
]));
if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:3000');
    allowedOrigins.push('http://localhost:3001');
    allowedOrigins.push('http://localhost:5173');
}
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin)
            return callback(null, true);
        const isAllowed = allowedOrigins.some(allowedOrigin => {
            return origin === allowedOrigin;
        });
        if (isAllowed) {
            callback(null, true);
        }
        else {
            console.warn(`[CORS] Blocked origin: ${origin}`);
            // 🛡️ SECURITY FIX: Actually block the request instead of allowing it
            callback(new Error(`Origin ${origin} not allowed by CORS policy`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'x-dev-master-key',
        'x-tenant-domain',
        'x-dev-firebase-token',
        'X-Tenant-Domain',
        'X-Dev-Firebase-Token',
        'X-Dev-Master-Key'
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204
}));
// Robust Port Binding - Handled Above
// ─── SECURITY HEADERS ──────────────────────────────────────────────────────
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use((0, compression_1.default)({ threshold: 1024 }));
app.use(xss_sanitizer_middleware_1.xssSanitizer);
app.use(rate_limit_middleware_1.generalLimiter);
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '1mb' }));
app.use(express_1.default.static('public'));
app.use('/uploads', express_1.default.static('public/uploads'));
app.use((0, morgan_1.default)(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
// ─── HEALTH PROTOCOL (Nuclear Bypass) ──────────────────────────────────────
app.get('/api/health', async (req, res) => {
    try {
        await client_1.default.$queryRaw `SELECT 1`;
        return res.json({
            status: isBooted ? 'UP' : 'BOOTING',
            database: 'CONNECTED',
            version: APP_VERSION,
            last_sync: '2026-04-29T09:12:00Z',
            client: 'MC-Bauchemie Ghana',
            bootComplete: isBooted,
            nodeEnv: process.env.NODE_ENV
        });
    }
    catch (err) {
        console.error('[Health] System Degraded:', err.message);
        return res.status(503).json({
            status: 'DEGRADED',
            database: 'DISCONNECTED',
            version: APP_VERSION,
            error: err.message
        });
    }
});
app.get('/', (_req, res) => res.json({ message: '🚀 MCB HRM Ghana Platform Core Running', version: APP_VERSION, status: isBooted ? 'READY' : 'BOOTING' }));
// Init WebSocket (After security)
(0, websocket_service_1.initWebSocket)(server);
// ─── CRON JOBS ─────────────────────────────────────────────────────────────
node_cron_1.default.schedule('0 */12 * * *', async () => {
    console.log('[CRON] Running backup...');
    try {
        await maintenanceService.runBackup();
    }
    catch (e) {
        console.error('[CRON] Backup failed:', e);
    }
});
node_cron_1.default.schedule('0 2 * * *', async () => {
    try {
        const n = await (0, leave_balance_service_1.accrueLeaveBalances)();
        if (n)
            console.log(`[CRON] Accrued leave for ${n} users`);
    }
    catch (e) {
        console.error('[CRON] Leave accrual failed:', e);
    }
});
node_cron_1.default.schedule('0 8 * * *', async () => {
    try {
        const [leaves, appraisals] = await Promise.all([(0, reminder_service_1.sendLeaveReminders)(), (0, reminder_service_1.sendAppraisalReminders)()]);
        if (leaves || appraisals)
            console.log(`[CRON] Reminders: ${leaves} leave, ${appraisals} appraisals`);
    }
    catch (e) {
        console.error('[CRON] Reminder sweep failed:', e);
    }
});
node_cron_1.default.schedule('0 9 * * *', async () => {
    try {
        await renewal_service_1.RenewalService.checkExpirations();
    }
    catch (e) {
        console.error('[Cron] Renewal check failed:', e);
    }
});
// OKR weekly check-in nudge — every Monday at 8:30am
node_cron_1.default.schedule('30 8 * * 1', async () => {
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const staleObjectives = await client_1.default.target.findMany({
            where: {
                status: 'IN_PROGRESS',
                isArchived: false,
                updatedAt: { lt: sevenDaysAgo }
            },
            select: { id: true, title: true, assigneeId: true }
        });
        const { notify } = await Promise.resolve().then(() => __importStar(require('./services/websocket.service')));
        let count = 0;
        for (const obj of staleObjectives) {
            if (!obj.assigneeId)
                continue;
            await notify(obj.assigneeId, '📊 OKR Weekly Check-in', `Update your Key Results for: "${obj.title}"`, 'INFO', '/kpi/my-targets').catch(() => { });
            count++;
        }
        if (count)
            console.log(`[CRON] OKR check-in nudges sent: ${count}`);
    }
    catch (e) {
        console.error('[Cron] OKR check-in failed:', e);
    }
});
/*
cron.schedule('0 2 * * *', async () => {
  try {
    const { resetDemoTenant } = await import('./scripts/reset-demo-tenant');
    await resetDemoTenant();
  } catch (e) { console.error('[Cron] Demo reset failed:', e); }
});
*/
// ─── TELEMETRY & TENANT RESOLUTION ──────────────────────────────────────────
const telemetry_middleware_1 = require("./middleware/telemetry.middleware");
const tenant_middleware_1 = require("./middleware/tenant.middleware");
app.use(telemetry_middleware_1.apiUsageMiddleware);
app.use(tenant_middleware_1.resolveTenant);
// ─── DEV ROUTES (bypass maintenance, high rate limit) ────────────────────────
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_PRODUCTION_DEV_ROUTES === 'true') {
    app.use('/api/dev', rate_limit_middleware_1.devLimiter, dev_routes_1.default);
}
// ─── MAINTENANCE GUARD ──────────────────────────────────────────────────────
const maintenance_middleware_1 = require("./middleware/maintenance.middleware");
app.use(maintenance_middleware_1.maintenanceMiddleware);
// MC-Bauchemie Ghana is a licensed deployment. No billing lock.
app.use((_req, _res, next) => next());
var isBooted = false;
// ─── STARTUP PROTOCOL ───────────────────────────────────────────────────────
const runStartupTasks = async () => {
    console.log('[Startup] MCB HRM Ghana core initialization...');
    try {
        // We skip heavy tasks here to ensure stability on Render hardware.
        // Telemetry and background syncs are handled by the live SchedulerService.
        isBooted = true;
        console.log(`\n🎉 MCB HRM Ghana Platform Core fully operational at ${new Date().toISOString()}\n`);
    }
    catch (err) {
        console.error('\n❌ [CRITICAL] Background Startup Stalled:');
        console.error(err.message);
        isBooted = true;
    }
};
// ─── ROUTES ─────────────────────────────────────────────────────────────────
// Debug routes — development only
if (process.env.NODE_ENV !== 'production') {
    const debugRoutes = require('./routes/debug.routes').default;
    app.use('/api/debug-env', debugRoutes);
}
// Startup Sync deferred to after port binding to ensure deploy stability
app.use('/api/auth', auth_routes_1.default);
app.use('/api/announcements', announcement_routes_1.default);
app.use('/api/sub-units', sub_unit_routes_1.default);
app.use('/api/team', team_routes_1.default);
app.use('/api/kpi', kpi_routes_1.default);
// Note: /api/kpis alias removed — use /api/kpi (consolidated 2026-05-17)
app.use('/api/targets', target_routes_1.default);
app.use('/api/leave', leave_routes_1.default);
app.use('/api/cycles', cycle_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/employees', user_routes_1.default);
app.use('/api/appraisals', appraisal_routes_1.default);
app.use('/api/history', history_routes_1.default);
app.use('/api/assets', asset_routes_1.default);
app.use('/api/audit', audit_routes_1.default);
app.use('/api/dashboard', dashboard_routes_1.default);
app.use('/api/departments', department_routes_1.default);
app.use('/api/activity', activity_routes_1.default);
app.use('/api/notifications', notification_routes_1.default);
app.use('/api/payroll', payroll_routes_1.default);
app.use('/api/onboarding', onboarding_routes_1.default);
app.use('/api/training', training_routes_1.default);
app.use('/api/holidays', holiday_routes_1.default);
app.use('/api/orgchart', orgchart_routes_1.default);
app.use('/api/documents', document_routes_1.default);
app.use('/api/queries', query_routes_1.default);
app.use('/api/finance', finance_routes_1.default);
app.use('/api/attendance', attendance_routes_1.default);
app.use('/api/export', rate_limit_middleware_1.exportLimiter, export_routes_1.default);
app.use('/api/it', itadmin_routes_1.default);
app.use('/api/payment', payment_routes_1.default);
app.use('/api/privacy', privacy_routes_1.default);
app.use('/api/settings', settings_routes_1.default);
app.use('/api/maintenance', maintenance_routes_1.default);
app.use('/api/compensation', compensation_routes_1.default);
app.use('/api/enterprise', enterprise_routes_1.default);
app.use('/api/performance-v2', performance_v2_routes_1.default);
app.use('/api/analytics', analytics_routes_1.default);
app.use('/api/inbox', inbox_routes_1.default);
app.use('/api/upload', upload_routes_1.default);
app.use('/api/reporting', reporting_routes_1.default);
app.use('/api/recruitment', recruitment_routes_1.default);
app.use('/api/expenses', expense_routes_1.default);
app.use('/api/support', support_routes_1.default);
app.use('/api/offboarding', offboarding_routes_1.default);
app.use('/api/hr', hrFeatures_routes_1.default);
app.use('/api/public/v1', public_api_routes_1.default);
app.use('/api/integrations', integrations_routes_1.default);
app.use('/api/bot', rate_limit_middleware_1.aiLimiter, bot_routes_1.default);
app.use('/api/biometric', biometric_routes_1.default);
app.use('/api/ai', rate_limit_middleware_1.aiLimiter, ai_routes_1.default);
app.use('/api/policy', policy_routes_1.default);
app.use('/api/continuous-performance', continuous_performance_routes_1.default);
app.use('/api/manager', manager_cockpit_routes_1.default);
app.use('/api', card_routes_1.default);
app.use('/api', callCard_routes_1.default);
app.use('/api/competencies', competency_routes_1.default);
// ─── DEBUG ROUTE (Development Only) ─────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
    app.get('/api/debug-routes', (req, res) => {
        const routes = [];
        app._router.stack.forEach((middleware) => {
            if (middleware.route) {
                routes.push({ path: middleware.route.path, methods: Object.keys(middleware.route.methods) });
            }
            else if (middleware.name === 'router') {
                middleware.handle.stack.forEach((handler) => {
                    if (handler.route) {
                        const path = middleware.regexp.toString().replace('/^', '').replace('\\/?(?=\\/|$)/i', '') + handler.route.path;
                        routes.push({ path: path.replace(/\\\//g, '/'), methods: Object.keys(handler.route.methods) });
                    }
                });
            }
        });
        res.json(routes);
    });
}
// ─── 404 HANDLER ──────────────────────────────────────────────────────────
app.use((req, res) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[404] ${req.method} ${req.path}`);
    }
    res.status(404).json({
        error: 'Route not found',
        requestedPath: req.path,
        requestedMethod: req.method,
        version: APP_VERSION
    });
});
// ─── ERROR HANDLER ──────────────────────────────────────────────────────────
const error_log_service_1 = require("./services/error-log.service");
const errors_1 = require("./utils/errors");
app.use((err, req, res, next) => {
    if (!(err instanceof errors_1.AppError)) {
        error_log_service_1.errorLogger.log('GlobalErrorHandler', err);
    }
    const statusCode = err.statusCode ?? 500;
    const code = err.code;
    if (statusCode >= 500) {
        console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
    }
    res.status(statusCode).json({
        success: false,
        error: err.message,
        ...(code && { code }),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});
// ─── START ──────────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', async () => {
    console.log(`\n🚀 MCB HRM Ghana Platform v${APP_VERSION} listening on http://0.0.0.0:${PORT}`);
    // Initialize internal services
    scheduler_service_1.SchedulerService.init();
    // Trigger background startup tasks
    runStartupTasks();
});
// Last Sync: Sat Apr 25 19:02:38 GMT 2026
// Deployment Sync: Sun Apr 26 15:45:42 GMT 2026
