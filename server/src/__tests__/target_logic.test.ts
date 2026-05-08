import { describe, it, expect } from 'vitest';

// ── Replication of Target Logic for Unit Testing ───────────────────────────

const calculateProgress = (target: any): number => {
    // A. Composite Progress (from children)
    if (target.childTargets && target.childTargets.length > 0) {
      let totalWeightedProgress = 0;
      target.childTargets.forEach((child: any) => {
        totalWeightedProgress += (Number(child.progress || 0) * Number(child.contributionWeight || 0)) / 100;
      });
      return Math.min(100, totalWeightedProgress);
    } 
    // B. Direct Progress (from metrics)
    if (target.metrics && target.metrics.length > 0) {
      let totalProgress = 0;
      let totalWeight = 0;
      target.metrics.forEach((m: any) => {
        if (m.targetValue && Number(m.targetValue) > 0) {
          const mProgress = Math.min(100, (Number(m.currentValue || 0) / Number(m.targetValue)) * 100);
          totalProgress += mProgress * Number(m.weight || 1.0);
          totalWeight += Number(m.weight || 1.0);
        }
      });
      return totalWeight > 0 ? (totalProgress / totalWeight) : 0;
    }
    return 0;
};

// ══════════════════════════════════════════════════════════════════════════
//  TESTS
// ══════════════════════════════════════════════════════════════════════════

describe('Target Strategy Logic: Progressive Rollups', () => {

  describe('Metric-Based Progress (Leaf Level)', () => {
    it('should calculate progress based on weighted metrics', () => {
      const target = {
        metrics: [
          { currentValue: 50, targetValue: 100, weight: 1.0 }, // 50% * 1.0 = 50
          { currentValue: 10, targetValue: 10, weight: 1.0 },  // 100% * 1.0 = 100
        ]
      };
      // (50 + 100) / 2 = 75
      expect(calculateProgress(target)).toBe(75);
    });

    it('should respect different metric weights', () => {
      const target = {
        metrics: [
          { currentValue: 20, targetValue: 40, weight: 2.0 }, // 50% * 2.0 = 100
          { currentValue: 0, targetValue: 10, weight: 1.0 },  // 0% * 1.0 = 0
        ]
      };
      // (100 + 0) / 3 = 33.33...
      expect(calculateProgress(target)).toBeCloseTo(33.33, 1);
    });

    it('should cap individual metric progress at 100%', () => {
        const target = {
            metrics: [
                { currentValue: 200, targetValue: 100, weight: 1.0 } // 200% limited to 100%
            ]
        };
        expect(calculateProgress(target)).toBe(100);
    });
  });

  describe('Strategic Rollup (Parent Level)', () => {
    it('should calculate parent progress from child contribution weights', () => {
      const parentTarget = {
        childTargets: [
          { progress: 100, contributionWeight: 50 }, // 50 points to parent
          { progress: 20, contributionWeight: 50 },  // 10 points to parent
        ]
      };
      // 50 + 10 = 60
      expect(calculateProgress(parentTarget)).toBe(60);
    });

    it('should work with single child contributing 100%', () => {
        const parentTarget = {
            childTargets: [
                { progress: 75, contributionWeight: 100 }
            ]
        };
        expect(calculateProgress(parentTarget)).toBe(75);
    });
  });

  describe('Acknowledgment Integrity', () => {
      const canUpdate = (status: string) => ['ACKNOWLEDGED', 'IN_PROGRESS'].includes(status);

      it('should allow updates when status is ACKNOWLEDGED', () => {
          expect(canUpdate('ACKNOWLEDGED')).toBe(true);
      });

      it('should prevent updates when status is UNDER_REVIEW', () => {
          expect(canUpdate('UNDER_REVIEW')).toBe(false);
      });

      it('should prevent updates when status is ASSIGNED', () => {
        expect(canUpdate('ASSIGNED')).toBe(false); // Must acknowledge first
      });
  });
});
