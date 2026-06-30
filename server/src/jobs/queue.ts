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

import { Queue, QueueOptions } from 'bullmq';

const connection = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL }
  : undefined;

const queueOptions: QueueOptions = connection ? { connection } : ({} as any);

function makeQueue(name: string): Queue | null {
  if (!connection) {
    console.warn(`[Queue] REDIS_URL not set — queue "${name}" is a no-op stub`);
    return null;
  }
  return new Queue(name, queueOptions);
}

export const leaveAccrualQueue = makeQueue('leave-accrual');
export const leaveReminderQueue = makeQueue('leave-reminders');
export const okrNudgeQueue = makeQueue('okr-nudge');
export const payrollBackupQueue = makeQueue('payroll-backup');

/**
 * Schedule all repeating jobs.
 * Call once at startup AFTER queue objects are initialised.
 */
export async function scheduleRepeatingJobs() {
  if (!connection) return;

  await leaveAccrualQueue?.add(
    'annual-carryover',
    {},
    { repeat: { pattern: '0 0 1 1 *' } } // Jan 1st midnight
  );

  await leaveReminderQueue?.add(
    'daily-reminder',
    {},
    { repeat: { pattern: '0 8 * * *' } } // 8am daily
  );

  await okrNudgeQueue?.add(
    'weekly-checkin-nudge',
    {},
    { repeat: { pattern: '0 8 * * 1' } } // 8am every Monday
  );

  await payrollBackupQueue?.add(
    'nightly-backup',
    {},
    { repeat: { pattern: '0 2 * * *' } } // 2am daily
  );

  console.log('[Queue] Repeating jobs scheduled via BullMQ');
}
