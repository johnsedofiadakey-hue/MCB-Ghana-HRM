/**
 * KPI Scoring Engine — Phase C: KPI Performance Core
 *
 * Handles scoring calculation for all KPI types (NUMERIC, PERCENTAGE, BOOLEAN, MILESTONE).
 * Scores are cached and only recalculated on KPI update events to avoid N+1 overhead.
 *
 * Scoring Philosophy:
 * - NUMERIC: (actual / target) * weight * 10 → normalized to 0-100
 * - PERCENTAGE: directly use actual as the %, capped at 100
 * - BOOLEAN: 100 if actual >= target, else 0
 * - MILESTONE: score set manually by reviewer (1-10 scale stored as-is)
 */
import prisma from '../prisma/client';

export type KpiMetricType = 'NUMERIC' | 'PERCENTAGE' | 'BOOLEAN' | 'MILESTONE';

interface KpiScoreInput {
  id: string;
  metricType: string;
  targetValue: number;
  actualValue: number;
  weight: number;
}

/**
 * Calculate a raw score (0-100) for a single KPI item.
 * Does NOT write to DB — pure computation.
 */
export const calculateRawScore = (kpi: any): number => {
  const targetValue = Number(kpi.targetValue) || 0;
  const actualValue = Number(kpi.actualValue) || 0;
  const weight = Number(kpi.weight) || 0;
  const metricType = kpi.metricType;
  
  const safeTarget = targetValue === 0 ? 1 : targetValue;

  let score = 0;

  switch (metricType as KpiMetricType) {
    case 'NUMERIC': {
      // Ratio of actual to target, capped at 100
      const ratio = Math.min(actualValue / safeTarget, 1.5); // allow 150% for overachievers
      score = ratio * 100;
      break;
    }
    case 'PERCENTAGE': {
      // Actual IS the percentage (e.g., 85 means 85% achieved)
      score = Math.min(actualValue, 100);
      break;
    }
    case 'BOOLEAN': {
      // Binary: fully achieved (actual >= target) or not
      score = actualValue >= targetValue ? 100 : 0;
      break;
    }
    case 'MILESTONE': {
      // Manually set on 1-10 scale. Normalize to 0-100.
      score = Math.min(actualValue * 10, 100);
      break;
    }
    default: {
      score = 0;
    }
  }

  // Apply weight factor (weight itself is a relative multiplier, not the final score)
  // The weight is used when computing the SHEET total, not the item score
  return Math.round(Math.min(score, 150) * 10) / 10; // cap at 150% for overachievers
};

/**
 * Calculate and persist the weighted total score for a KPI sheet.
 * Fetches all items in the sheet, calculates weighted average.
 *
 * Formula: Σ(itemScore * itemWeight) / Σ(itemWeight)
 * Result is normalized to 0-100.
 *
 * This is called whenever any KpiItem in the sheet changes — not on reads.
 */
export const recalculateSheetScore = async (sheetId: string): Promise<number> => {
  const items = await prisma.kpiItem.findMany({
    where: { sheetId },
    select: { id: true, metricType: true, targetValue: true, actualValue: true, weight: true },
  });

  if (items.length === 0) return 0;

  let weightedTotal = 0;
  let totalWeight = 0;

  for (const item of items) {
    const rawScore = calculateRawScore(item);

    // Persist the calculated score back to the item
    await prisma.kpiItem.update({
      where: { id: item.id },
      data: { score: rawScore },
    });

    const weight = Number(item.weight) || 0;
    weightedTotal += rawScore * weight;
    totalWeight += weight;
  }

  const sheetScore = totalWeight > 0 ? Math.round((weightedTotal / totalWeight) * 10) / 10 : 0;

  // Persist sheet-level total score
  await prisma.kpiSheet.update({
    where: { id: sheetId },
    data: { totalScore: sheetScore },
  });

  return sheetScore;
};

/**
 * Record a KPI progress update and trigger score recalculation.
 * This is the primary entry point for Phase C's "only calculate on update" rule.
 */
export const recordKpiUpdate = async (params: {
  kpiItemId: string;
  sheetId: string;
  organizationId: string;
  submittedById: string;
  value: number;
  comment?: string;
}): Promise<{ kpiUpdate: any; sheetScore: number }> => {
  const { kpiItemId, sheetId, organizationId, submittedById, value, comment } = params;

  // 1. Validate the KPI item exists
  const item = await prisma.kpiItem.findUnique({ where: { id: kpiItemId } });
  if (!item) throw new Error('KPI item not found');

  // 2. Update the actual value on the item
  await prisma.kpiItem.update({
    where: { id: kpiItemId },
    data: { actualValue: value, lastEntryDate: new Date() },
  });

  // 3. Record the historical update entry
  const kpiUpdate = await prisma.kpiUpdate.create({
    data: { organizationId, kpiItemId, value, comment, submittedById },
  });

  // 4. Recalculate the entire sheet score (triggered by this update)
  const sheetScore = await recalculateSheetScore(sheetId);

  return { kpiUpdate, sheetScore };
};

/**
 * Get the historical progress data for a KPI item.
 * Used for sparkline charts and analytics.
 */
export const getKpiHistory = async (kpiItemId: string) => {
  return prisma.kpiUpdate.findMany({
    where: { kpiItemId },
    orderBy: { createdAt: 'asc' },
    select: { value: true, comment: true, createdAt: true, submittedById: true },
  });
};

/**
 * Get a full analytics summary for a KPI sheet.
 */
export const getSheetAnalytics = async (sheetId: string) => {
  const items = await prisma.kpiItem.findMany({
    where: { sheetId },
    include: { updates: { orderBy: { createdAt: 'asc' } } },
  });

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    metricType: item.metricType,
    target: Number(item.targetValue),
    actual: Number(item.actualValue),
    weight: Number(item.weight),
    score: Number(item.score),
    progressPercent: Number(item.targetValue) > 0 ? Math.min((Number(item.actualValue) / Number(item.targetValue)) * 100, 100) : 0,
    history: item.updates.map((u) => ({ value: u.value, date: u.createdAt })),
  }));
};
