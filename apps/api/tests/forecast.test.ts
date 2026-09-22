import { describe, it, expect } from 'vitest';
import {
  calculateLeastSquaresSlope,
  calculateSeasonalityIndex,
} from '../src/services/forecast.js';

describe('Lightweight Demand Forecasting Engine (§5.4)', () => {
  it('correctly calculates linear trend slope using least squares', () => {
    // Upward trend: y = 2x + 1
    const risingSeries = [1, 3, 5, 7, 9, 11, 13];
    const slope = calculateLeastSquaresSlope(risingSeries);
    expect(slope).toBeCloseTo(2.0, 1);

    // Flat series
    const flatSeries = [5, 5, 5, 5, 5];
    expect(calculateLeastSquaresSlope(flatSeries)).toBeCloseTo(0.0, 1);

    // Downward trend: y = -1.5x + 10
    const fallingSeries = [10, 8.5, 7, 5.5, 4];
    expect(calculateLeastSquaresSlope(fallingSeries)).toBeCloseTo(-1.5, 1);
  });

  it('correctly computes day-of-week seasonality index', () => {
    // Generate synthetic events where Monday (day 1) has 2x normal demand
    const events = [];
    const baseDate = new Date('2026-01-04T00:00:00Z'); // Sunday (0)

    for (let i = 0; i < 28; i++) {
      const d = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
      const day = d.getDay();
      const qty = day === 1 ? 4 : 2; // Mondays = 4, others = 2
      events.push({ date: d, quantityRequested: qty });
    }

    const seasonality = calculateSeasonalityIndex(events);
    // Monday index should be higher than normal (1.0)
    expect(seasonality[1]).toBeGreaterThan(1.2);
    // Sunday index should be lower than Monday
    expect(seasonality[0]).toBeLessThan(seasonality[1]);
  });
});
