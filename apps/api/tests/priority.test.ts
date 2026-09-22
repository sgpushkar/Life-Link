import { describe, it, expect } from 'vitest';
import { calculatePriorityScore } from '../src/services/priority.js';

describe('Urgency Prioritization Engine (§5.1)', () => {
  it('bounds priority score strictly between 0 and 100', () => {
    const now = new Date();
    const neededByFuture = new Date(now.getTime() + 240 * 60 * 1000);

    const { priorityScore, breakdown } = calculatePriorityScore({
      patientCriticality: 5,
      neededBy: neededByFuture,
      createdAt: now,
      quantityRequested: 1,
      nearestViableProviderKm: 5,
      networkAvailableUnits: 1,
    });

    expect(priorityScore).toBeGreaterThanOrEqual(0);
    expect(priorityScore).toBeLessThanOrEqual(100);
    expect(breakdown.criticalityScore).toBe(100);
    expect(breakdown.weights.criticality).toBe(0.45);
  });

  it('gives maximum time score (100) when a request is overdue', () => {
    const now = new Date();
    const overdueTime = new Date(now.getTime() - 30 * 60 * 1000); // 30 min overdue

    const { breakdown } = calculatePriorityScore({
      patientCriticality: 3,
      neededBy: overdueTime,
      createdAt: new Date(now.getTime() - 60 * 60 * 1000),
      quantityRequested: 1,
    });

    expect(breakdown.timeScore).toBe(100);
  });

  it('awards anti-starvation age bonus as waiting time approaches 60 minutes', () => {
    const now = new Date();
    const neededBy = new Date(now.getTime() + 180 * 60 * 1000);
    const createdJustNow = now;
    const created60MinsAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const freshReq = calculatePriorityScore({
      patientCriticality: 3,
      neededBy,
      createdAt: createdJustNow,
      quantityRequested: 1,
    });

    const waitingReq = calculatePriorityScore({
      patientCriticality: 3,
      neededBy,
      createdAt: created60MinsAgo,
      quantityRequested: 1,
    });

    expect(freshReq.breakdown.ageBonus).toBe(0);
    expect(waitingReq.breakdown.ageBonus).toBe(100);
    expect(waitingReq.priorityScore).toBeGreaterThan(freshReq.priorityScore);
  });

  it('ranks high criticality and time-critical requests significantly higher', () => {
    const now = new Date();
    const criticalNeededBy = new Date(now.getTime() + 20 * 60 * 1000); // 20m
    const stableNeededBy = new Date(now.getTime() + 240 * 60 * 1000); // 4h

    const highUrgency = calculatePriorityScore({
      patientCriticality: 5,
      neededBy: criticalNeededBy,
      createdAt: now,
      quantityRequested: 1,
      nearestViableProviderKm: 10,
    });

    const lowUrgency = calculatePriorityScore({
      patientCriticality: 1,
      neededBy: stableNeededBy,
      createdAt: now,
      quantityRequested: 1,
      nearestViableProviderKm: 80,
    });

    expect(highUrgency.priorityScore).toBeGreaterThan(lowUrgency.priorityScore + 40);
  });
});
