/**
 * backfill-leave-request-days.ts
 * One-off backfill: populates LeaveRequestDay rows for every existing LeaveRequest,
 * using the same weekday/holiday logic the system already used to compute leaveDays.
 * Idempotent — safe to re-run (relies on the LeaveRequestDay @@unique([leaveRequestId, date]) constraint).
 * Run via: npx ts-node src/scripts/backfill-leave-request-days.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function calculateWorkingDays(start: Date, end: Date, holidaySet: Set<string>): Date[] {
  const days: Date[] = [];
  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const fin = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

  while (cur <= fin) {
    const d = cur.getUTCDay();
    const dateStr = cur.toISOString().split('T')[0];
    const isWeekend = (d === 0 || d === 6);
    const isHoliday = holidaySet.has(dateStr);
    if (!isWeekend && !isHoliday) days.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

async function main() {
  console.log('🔍 Loading existing LeaveRequest rows without backfilled days...');

  const requests = await prisma.leaveRequest.findMany({
    select: { id: true, organizationId: true, startDate: true, endDate: true, leaveDays: true },
  });
  console.log(`Found ${requests.length} leave requests to process.`);

  // Cache holidays per org to avoid refetching for every row
  const holidaySetCache = new Map<string, Set<string>>();
  async function getHolidaySet(organizationId: string): Promise<Set<string>> {
    const key = organizationId || 'mcb-ghana-tenant';
    if (holidaySetCache.has(key)) return holidaySetCache.get(key)!;
    const holidays = await prisma.publicHoliday.findMany({ where: { organizationId: key }, take: 1000 });
    const set = new Set(holidays.map(h => new Date(h.date).toISOString().split('T')[0]));
    holidaySetCache.set(key, set);
    return set;
  }

  let inserted = 0;
  let skippedExisting = 0;
  let mismatches: string[] = [];

  for (const req of requests) {
    const existingCount = await prisma.leaveRequestDay.count({ where: { leaveRequestId: req.id } });
    if (existingCount > 0) {
      skippedExisting++;
      continue;
    }

    const holidaySet = await getHolidaySet(req.organizationId || 'mcb-ghana-tenant');
    const days = calculateWorkingDays(req.startDate, req.endDate, holidaySet);

    if (days.length === 0) {
      // Matches the Math.max(1, count) floor in the original calculation — no real
      // weekday exists in the range, but leaveDays was stored as >= 1. Nothing valid
      // to backfill; flag for manual review rather than guessing a date.
      mismatches.push(`${req.id} (range ${req.startDate.toISOString().slice(0,10)}–${req.endDate.toISOString().slice(0,10)}, stored leaveDays=${req.leaveDays})`);
      continue;
    }

    await prisma.leaveRequestDay.createMany({
      data: days.map(date => ({
        organizationId: req.organizationId || 'mcb-ghana-tenant',
        leaveRequestId: req.id,
        date,
      })),
      skipDuplicates: true,
    });
    inserted += days.length;

    if (Number(req.leaveDays) !== days.length) {
      mismatches.push(`${req.id}: stored leaveDays=${req.leaveDays} but recomputed working-day count=${days.length}`);
    }
  }

  console.log(`✅ Backfilled ${inserted} LeaveRequestDay rows.`);
  console.log(`↩️  Skipped ${skippedExisting} requests that already had days (idempotent re-run).`);
  if (mismatches.length) {
    console.warn(`⚠️  ${mismatches.length} requests had a leaveDays mismatch or zero valid weekdays — review manually:`);
    mismatches.forEach(m => console.warn(`   - ${m}`));
  }
}

main()
  .catch(e => {
    console.error('❌ Error backfilling leave request days:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
