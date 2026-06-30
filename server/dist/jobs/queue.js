"use strict";
/**
 * BullMQ Job Queue — replaces node-cron for all scheduled background work.
 *
 * Requires REDIS_URL env var. When absent, falls back silently (jobs not enqueued).
 *
 * Queues defined:
 *   - leave-accrual    (run Jan 1st via repeat)
 *   - leave-reminders  (run daily 8am)
 *   - okr-nudge        (run Mondays 8am)
 *   - payroll-backup   (run daily 2am)
 *
 * Workers are registered in server/src/jobs/workers/*.ts
 * Register all workers in server/src/app.ts:
 *   import './jobs/workers/index';
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.payrollBackupQueue = exports.okrNudgeQueue = exports.leaveReminderQueue = exports.leaveAccrualQueue = void 0;
exports.scheduleRepeatingJobs = scheduleRepeatingJobs;
const bullmq_1 = require("bullmq");
const connection = process.env.REDIS_URL
    ? { url: process.env.REDIS_URL }
    : undefined;
const queueOptions = connection ? { connection } : {};
function makeQueue(name) {
    if (!connection) {
        console.warn(`[Queue] REDIS_URL not set — queue "${name}" is a no-op stub`);
        return null;
    }
    return new bullmq_1.Queue(name, queueOptions);
}
exports.leaveAccrualQueue = makeQueue('leave-accrual');
exports.leaveReminderQueue = makeQueue('leave-reminders');
exports.okrNudgeQueue = makeQueue('okr-nudge');
exports.payrollBackupQueue = makeQueue('payroll-backup');
/**
 * Schedule all repeating jobs.
 * Call once at startup AFTER queue objects are initialised.
 */
async function scheduleRepeatingJobs() {
    if (!connection)
        return;
    await exports.leaveAccrualQueue?.add('annual-carryover', {}, { repeat: { pattern: '0 0 1 1 *' } } // Jan 1st midnight
    );
    await exports.leaveReminderQueue?.add('daily-reminder', {}, { repeat: { pattern: '0 8 * * *' } } // 8am daily
    );
    await exports.okrNudgeQueue?.add('weekly-checkin-nudge', {}, { repeat: { pattern: '0 8 * * 1' } } // 8am every Monday
    );
    await exports.payrollBackupQueue?.add('nightly-backup', {}, { repeat: { pattern: '0 2 * * *' } } // 2am daily
    );
    console.log('[Queue] Repeating jobs scheduled via BullMQ');
}
