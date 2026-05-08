import { describe, it, expect } from 'vitest';

// ── Replication of Appraisal Logic for Unit Testing ─────────────────────────

const APPRAISAL_STAGES = [
  'SELF_REVIEW',
  'MANAGER_REVIEW',
  'FINAL_REVIEW'
];

const getReviewerForStage = (packet: any, stage: string): string | null => {
  if (stage === 'SELF_REVIEW') return packet.employeeId;
  if (stage === 'MANAGER_REVIEW') return packet.supervisorId || packet.managerId;
  if (stage === 'FINAL_REVIEW') return packet.finalReviewerId || packet.hrReviewerId;
  return null;
};

const determineNextStage = (packet: any): string => {
  const currentIndex = APPRAISAL_STAGES.indexOf(packet.currentStage);
  let nextIndex = currentIndex + 1;
  let nextStage = 'COMPLETED';

  while (nextIndex < APPRAISAL_STAGES.length) {
    const candidateStage = APPRAISAL_STAGES[nextIndex];
    const reviewerId = getReviewerForStage(packet, candidateStage);

    // Rule: Skip if no valid reviewer
    if (!reviewerId) {
      nextIndex++;
      continue;
    }

    // Rule: Collapse duplicates (if next reviewer is same as current)
    const currentReviewer = getReviewerForStage(packet, packet.currentStage);
    if (reviewerId === currentReviewer) {
      nextIndex++;
      continue;
    }

    nextStage = candidateStage;
    break;
  }
  return nextStage;
};

const redactReview = (review: any, viewerId: string, viewerRank: number): any => {
  const isHighRank = viewerRank >= 85;
  const isMyReview = review.reviewerId === viewerId;

  if (isHighRank || isMyReview) {
    return review;
  }

  return {
    ...review,
    summary: '[Blind Review]',
    overallRating: null,
  };
};

// ══════════════════════════════════════════════════════════════════════════
//  TESTS
// ══════════════════════════════════════════════════════════════════════════

describe('Appraisal Logic: Progression & Privacy', () => {

  describe('Stage Advancing (Collapse Logic)', () => {
    it('should advance from SELF to MANAGER if reviewers are different', () => {
      const packet = { 
        currentStage: 'SELF_REVIEW', 
        employeeId: 'EMP1', 
        supervisorId: 'MGR1' 
      };
      expect(determineNextStage(packet)).toBe('MANAGER_REVIEW');
    });

    it('should SKIP MANAGER_REVIEW if Supervisor is same as Employee (Self-Managed)', () => {
      const packet = { 
        currentStage: 'SELF_REVIEW', 
        employeeId: 'MGR1', 
        supervisorId: 'MGR1', // Self is supervisor
        finalReviewerId: 'MD1'
      };
      // Should skip MANAGER_REVIEW because reviewer is same as SELF_REVIEW
      expect(determineNextStage(packet)).toBe('FINAL_REVIEW');
    });

    it('should advance to COMPLETED if no more reviewers', () => {
      const packet = { 
        currentStage: 'FINAL_REVIEW', 
        employeeId: 'EMP1', 
        supervisorId: 'MGR1',
        finalReviewerId: 'MD1'
      };
      expect(determineNextStage(packet)).toBe('COMPLETED');
    });
  });

  describe('Privacy & Redaction', () => {
    const sampleReview = {
        reviewerId: 'MGR1',
        summary: 'Excellent performance',
        overallRating: 95
    };

    it('should NOT redact if viewer is HR/MD (Rank 85+)', () => {
      const redacted = redactReview(sampleReview, 'MD1', 90);
      expect(redacted.summary).toBe('Excellent performance');
      expect(redacted.overallRating).toBe(95);
    });

    it('should NOT redact if viewer is the Reviewer themselves', () => {
      const redacted = redactReview(sampleReview, 'MGR1', 70);
      expect(redacted.summary).toBe('Excellent performance');
      expect(redacted.overallRating).toBe(95);
    });

    it('should REDACT if viewer is the Employee (Rank 50)', () => {
      const redacted = redactReview(sampleReview, 'EMP1', 50);
      expect(redacted.summary).toBe('[Blind Review]');
      expect(redacted.overallRating).toBeNull();
    });
  });
});
