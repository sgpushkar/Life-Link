import { prisma } from '../prisma.js';

export interface ForecastPoint {
  dayOffset: number;
  date: string;
  predictedDemand: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface FacilityForecastResult {
  facilityId: string;
  facilityName: string;
  resourceKey: string;
  availableUnits: number;
  sma7: number;
  sma30: number;
  trendSlope: number;
  forecast: ForecastPoint[];
  total3DayDemand: number;
  alertNeeded: boolean;
  alertMessage?: string;
}

/**
 * Calculates least-squares linear regression slope.
 */
export function calculateLeastSquaresSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = values[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return 0;

  return (n * sumXY - sumX * sumY) / denominator;
}

/**
 * Calculates day-of-week seasonality index.
 * Mean of that weekday / overall mean over the dataset.
 */
export function calculateSeasonalityIndex(
  events: Array<{ date: Date; quantityRequested: number }>
): Record<number, number> {
  const weekdayTotals: Record<number, { sum: number; count: number }> = {
    0: { sum: 0, count: 0 },
    1: { sum: 0, count: 0 },
    2: { sum: 0, count: 0 },
    3: { sum: 0, count: 0 },
    4: { sum: 0, count: 0 },
    5: { sum: 0, count: 0 },
    6: { sum: 0, count: 0 },
  };

  let totalSum = 0;
  let totalCount = 0;

  for (const e of events) {
    const day = new Date(e.date).getDay();
    weekdayTotals[day].sum += e.quantityRequested;
    weekdayTotals[day].count += 1;
    totalSum += e.quantityRequested;
    totalCount += 1;
  }

  const overallMean = totalCount > 0 ? totalSum / totalCount : 1;
  const seasonality: Record<number, number> = {};

  for (let d = 0; d < 7; d++) {
    const dayMean = weekdayTotals[d].count > 0 ? weekdayTotals[d].sum / weekdayTotals[d].count : overallMean;
    seasonality[d] = overallMean > 0 ? Math.round((dayMean / overallMean) * 100) / 100 : 1.0;
  }

  return seasonality;
}

/**
 * Core forecasting function:
 * forecast(day) = SMA7 * seasonalityIndex(weekday) + trendSlope * daysAhead
 */
export async function generateFacilityForecast(params: {
  facilityId: string;
  resourceKey: string;
  daysAhead?: number;
  surgeMultiplier?: number;
}): Promise<FacilityForecastResult> {
  const { facilityId, resourceKey, daysAhead = 7, surgeMultiplier = 1.0 } = params;

  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
  });

  const facilityName = facility?.name || 'Facility';

  // Available units right now
  const eqType = await prisma.equipmentType.findUnique({ where: { code: resourceKey } });
  let availableUnits = 0;

  if (eqType) {
    availableUnits = await prisma.equipmentUnit.count({
      where: { facilityId, typeId: eqType.id, status: 'AVAILABLE' },
    });
  }

  // Fetch past 90 days of demand events
  const demandHistory = await prisma.demandEvent.findMany({
    where: { facilityId, resourceKey },
    orderBy: { date: 'desc' },
    take: 90,
  });

  // 1. Calculate 7-day and 30-day Simple Moving Average (SMA)
  const last7Days = demandHistory.slice(0, 7);
  const last30Days = demandHistory.slice(0, 30);
  const last14Days = demandHistory.slice(0, 14);

  const sum7 = last7Days.reduce((acc, curr) => acc + curr.quantityRequested, 0);
  const sma7 = last7Days.length > 0 ? sum7 / last7Days.length : 1.5;

  const sum30 = last30Days.reduce((acc, curr) => acc + curr.quantityRequested, 0);
  const sma30 = last30Days.length > 0 ? sum30 / last30Days.length : 1.2;

  // 2. Day-of-week seasonality index
  const seasonality = calculateSeasonalityIndex(demandHistory);

  // 3. Trend slope over the last 14 days
  const trendValues = [...last14Days].reverse().map((d) => d.quantityRequested);
  const trendSlope = calculateLeastSquaresSlope(trendValues);

  // 4. Coefficient of variation to determine confidence
  const mean = sma7 > 0 ? sma7 : 1;
  const variance =
    last7Days.reduce((acc, curr) => acc + Math.pow(curr.quantityRequested - mean, 2), 0) /
    (last7Days.length || 1);
  const stdDev = Math.sqrt(variance);
  const cov = stdDev / mean;
  const baseConfidence = Math.max(0.65, Math.min(0.95, 1 - cov * 0.3));

  // 5. Generate future projections
  const forecast: ForecastPoint[] = [];
  const now = new Date();
  let total3DayDemand = 0;

  for (let day = 1; day <= daysAhead; day++) {
    const futureDate = new Date(now.getTime() + day * 24 * 60 * 60 * 1000);
    const weekday = futureDate.getDay();
    const seasonalIdx = seasonality[weekday] || 1.0;

    const rawPred = (sma7 * seasonalIdx + trendSlope * day) * surgeMultiplier;
    const predicted = Math.max(0, Math.round(rawPred * 10) / 10);

    if (day <= 3) {
      total3DayDemand += predicted;
    }

    forecast.push({
      dayOffset: day,
      date: futureDate.toISOString().split('T')[0],
      predictedDemand: predicted,
      lowerBound: Math.max(0, Math.round((predicted * 0.75) * 10) / 10),
      upperBound: Math.round((predicted * 1.35) * 10) / 10,
      confidence: Math.round((baseConfidence * Math.max(0.7, 1 - day * 0.04)) * 100) / 100,
    });
  }

  // 6. Check if alert is needed: 3-day predicted demand > available * 0.8
  const threshold = availableUnits * 0.8;
  const alertNeeded = total3DayDemand > threshold;
  let alertMessage;

  if (alertNeeded) {
    alertMessage = `${facilityName} expects ~${Math.ceil(total3DayDemand)} ${resourceKey.toLowerCase().replace('_', ' ')} requests in the next 3 days; you have ${availableUnits} available. Consider pre-positioning stock from neighbouring CHC.`;
  }

  return {
    facilityId,
    facilityName,
    resourceKey,
    availableUnits,
    sma7: Math.round(sma7 * 10) / 10,
    sma30: Math.round(sma30 * 10) / 10,
    trendSlope: Math.round(trendSlope * 100) / 100,
    forecast,
    total3DayDemand: Math.round(total3DayDemand * 10) / 10,
    alertNeeded,
    alertMessage,
  };
}
