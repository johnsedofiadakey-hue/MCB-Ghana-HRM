// MCB HRM Ghana - Production Sync: 2026-04-26
const APP_VERSION = require('../package.json').version || '4.0.0';
console.log(`[Startup] ${new Date().toISOString()} - MCB HRM Ghana v${APP_VERSION} Initializing...`);
// 🚀 DEPLOYMENT HEARTBEAT: 2026-04-28T21:20:00Z
import express, { Application, Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
dotenv.config();
import cron from 'node-cron';
import prisma from './prisma/client';
import * as maintenanceService from './services/maintenance.service';
import { accrueLeaveBalances } from './services/leave-balance.service';
import { sendAppraisalReminders, sendLeaveReminders } from './services/reminder.service';
import { RenewalService } from './services/renewal.service';
import { initWebSocket } from './services/websocket.service';
import { TargetService } from './services/target.service';
import { SchedulerService } from './services/scheduler.service';
import { initializeFirebase } from './services/firebase-admin';

// Initialize Firebase Admin before routes
initializeFirebase();
import { generalLimiter, exportLimiter, devLimiter, aiLimiter } from './middleware/rate-limit.middleware';
import { xssSanitizer } from './middleware/xss-sanitizer.middleware';

// Routes
import authRoutes from './routes/auth.routes';
import announcementRoutes from './routes/announcement.routes';
import subUnitRoutes from './routes/sub-unit.routes';
import kpiRoutes from './routes/kpi.routes';
import teamRoutes from './routes/team.routes';
import leaveRoutes from './routes/leave.routes';
import cycleRoutes from './routes/cycle.routes';
import userRoutes from './routes/user.routes';
import appraisalRoutes from './routes/appraisal.routes';
import historyRoutes from './routes/history.routes';
import assetRoutes from './routes/asset.routes';
import auditRoutes from './routes/audit.routes';
import dashboardRoutes from './routes/dashboard.routes';
import departmentRoutes from './routes/department.routes';
import activityRoutes from './routes/activity.routes';
import notificationRoutes from './routes/notification.routes';
import payrollRoutes from './routes/payroll.routes';
import onboardingRoutes from './routes/onboarding.routes';
import trainingRoutes from './routes/training.routes';
import holidayRoutes from './routes/holiday.routes';
import orgchartRoutes from './routes/orgchart.routes';
import analyticsRoutes from './routes/analytics.routes';
import exportRoutes from './routes/export.routes';
import itadminRoutes from './routes/itadmin.routes';
import paymentRoutes from './routes/payment.routes';
import privacyRoutes from './routes/privacy.routes';
import devRoutes from './routes/dev.routes';
import documentRoutes from './routes/document.routes';
import queryRoutes from './routes/query.routes';
import financeRoutes from './routes/finance.routes';
import attendanceRoutes from './routes/attendance.routes';
import compensationRoutes from './routes/compensation.routes';
import enterpriseRoutes from './routes/enterprise.routes';
import performanceV2Routes from './routes/performance-v2.routes';
import targetRoutes from './routes/target.routes';
import inboxRoutes from './routes/inbox.routes';
import uploadRoutes from './routes/upload.routes';
import reportingRoutes from './routes/reporting.routes';
import recruitmentRoutes from './routes/recruitment.routes';
import expenseRoutes from './routes/expense.routes';
import supportRoutes from './routes/support.routes';
import offboardingRoutes from './routes/offboarding.routes';
import hrFeaturesRoutes from './routes/hrFeatures.routes';
import publicApiRoutes from './routes/public-api.routes';
import integrationsRoutes from './routes/integrations.routes';
import botRoutes from './routes/bot.routes';
import settingsRoutes from './routes/settings.routes';
import maintenanceRoutes from './routes/maintenance.routes';
import aiRoutes from './routes/ai.routes';
import biometricRoutes from './routes/biometric.routes';

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

const app: Application = express();
app.set('trust proxy', 1);

// ─── INITIALIZE SERVER (Global Context) ────────────────────────────────────
const rawPort = process.env.PORT || '5000';
const PORT = parseInt(rawPort, 10);
const server = http.createServer(app);

// ─── NUCLEAR CORS BRIDGE (Top Priority) ────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  const allowed = [
    'https://mcb-hrm-ghana.web.app',
    'https://mcb-hrm-ghana.firebaseapp.com',
    // Add custom domain later: 'https://hrm.mc-bauchemie.com.gh',
    'http://localhost:3000',
    'http://localhost:5173',
  ];

  if (origin && (allowed.includes(origin) || allowed.some(a => origin.startsWith(a)))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, x-dev-master-key, x-tenant-domain, x-dev-firebase-token, X-Tenant-Domain, X-Dev-Firebase-Token, X-Dev-Master-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Robust Port Binding - Handled Above

// ─── SECURITY HEADERS ──────────────────────────────────────────────────────
app.use(helmet({ 
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(xssSanitizer);
app.use(generalLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.static('public'));
app.use('/uploads', express.static('public/uploads'));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Init WebSocket (After security)
initWebSocket(server);

// ─── CRON JOBS ─────────────────────────────────────────────────────────────
cron.schedule('0 */12 * * *', async () => {
  console.log('[CRON] Running backup...');
  try { await maintenanceService.runBackup(); } catch (e) { console.error('[CRON] Backup failed:', e); }
});

cron.schedule('0 2 * * *', async () => {
  try { const n = await accrueLeaveBalances(); if (n) console.log(`[CRON] Accrued leave for ${n} users`); }
  catch (e) { console.error('[CRON] Leave accrual failed:', e); }
});

cron.schedule('0 8 * * *', async () => {
  try {
    const [leaves, appraisals] = await Promise.all([sendLeaveReminders(), sendAppraisalReminders()]);
    if (leaves || appraisals) console.log(`[CRON] Reminders: ${leaves} leave, ${appraisals} appraisals`);
  } catch (e) { console.error('[CRON] Reminder sweep failed:', e); }
});

cron.schedule('0 9 * * *', async () => {
  try { await RenewalService.checkExpirations(); } 
  catch (e) { console.error('[Cron] Renewal check failed:', e); }
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
import { apiUsageMiddleware } from './middleware/telemetry.middleware';
import { resolveTenant } from './middleware/tenant.middleware';
app.use(apiUsageMiddleware);
app.use(resolveTenant);

// ─── DEV ROUTES (bypass maintenance, high rate limit) ────────────────────────
app.use('/api/dev', devLimiter, devRoutes);

// ─── MAINTENANCE GUARD ──────────────────────────────────────────────────────
import { maintenanceMiddleware } from './middleware/maintenance.middleware';
import { subscriptionGuard } from './middleware/subscription.middleware';
app.use(maintenanceMiddleware);
// MC-Bauchemie Ghana is a licensed deployment. No billing lock.
app.use((_req, _res, next) => next());

let isBooted = false;

// ─── STARTUP PROTOCOL ───────────────────────────────────────────────────────
const runStartupTasks = async () => {
  console.log('[Startup] MCB HRM Ghana core initialization...');
  try {
    // We skip heavy tasks here to ensure stability on Render hardware.
    // Telemetry and background syncs are handled by the live SchedulerService.
    
    isBooted = true;
    console.log(`\n🎉 MCB HRM Ghana Platform Core fully operational at ${new Date().toISOString()}\n`);
  } catch (err: any) {
    console.error('\n❌ [CRITICAL] Background Startup Stalled:');
    console.error(err.message);
    isBooted = true; 
  }
};

// ─── ROUTES ─────────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ 
      status: isBooted ? 'UP' : 'BOOTING', 
      database: 'CONNECTED',
      version: APP_VERSION,
      last_sync: '2026-04-28T21:20:00Z',
      client: 'MC-Bauchemie Ghana',
      bootComplete: isBooted,
      nodeEnv: process.env.NODE_ENV 
    });
  } catch (err: any) {
    console.error('[Health] System Degraded:', err.message);
    return res.status(503).json({ 
      status: 'DEGRADED', 
      database: 'DISCONNECTED',
      version: APP_VERSION,
      error: err.message 
    });
  }
});


app.get('/', (_req: Request, res: Response) => res.json({ message: '🚀 MCB HRM Ghana Platform Core Running', version: APP_VERSION, status: isBooted ? 'READY' : 'BOOTING' }));

// Debug routes — development only
if (process.env.NODE_ENV !== 'production') {
  const debugRoutes = require('./routes/debug.routes').default;
  app.use('/api/debug-env', debugRoutes);
}

// Startup Sync deferred to after port binding to ensure deploy stability

app.use('/api/auth', authRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/sub-units', subUnitRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/kpi', kpiRoutes);
app.use('/api/kpis', kpiRoutes);
app.use('/api/targets', targetRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/cycles', cycleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employees', userRoutes); 
app.use('/api/appraisals', appraisalRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/orgchart', orgchartRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/export', exportLimiter, exportRoutes);
app.use('/api/it', itadminRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/compensation', compensationRoutes);
app.use('/api/enterprise', enterpriseRoutes);
app.use('/api/performance-v2', performanceV2Routes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/inbox', inboxRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reporting', reportingRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/offboarding', offboardingRoutes);
app.use('/api/hr', hrFeaturesRoutes);
app.use('/api/public/v1', publicApiRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/bot', aiLimiter, botRoutes);
app.use('/api/biometric', biometricRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);

// ─── DEBUG ROUTE (Development Only) ─────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  (app as any).get('/api/debug-routes', (req: Request, res: Response) => {
    const routes: any[] = [];
    (app as any)._router.stack.forEach((middleware: any) => {
      if (middleware.route) {
        routes.push({ path: middleware.route.path, methods: Object.keys(middleware.route.methods) });
      } else if (middleware.name === 'router') {
        middleware.handle.stack.forEach((handler: any) => {
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
app.use((req: Request, res: Response) => {
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
import { errorLogger } from './services/error-log.service';

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  errorLogger.log('GlobalErrorHandler', err);
  res.status(500).json({ 
    success: false, 
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
  });
});

// ─── START ──────────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n🚀 MCB HRM Ghana Platform v${APP_VERSION} listening on http://0.0.0.0:${PORT}`);
  
  // Initialize internal services
  SchedulerService.init();

  // Trigger background startup tasks
  runStartupTasks();
});
// Last Sync: Sat Apr 25 19:02:38 GMT 2026
// Deployment Sync: Sun Apr 26 15:45:42 GMT 2026
