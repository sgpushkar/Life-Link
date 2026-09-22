import { PriorityWeights, DEFAULT_PRIORITY_WEIGHTS } from '@lifelink/shared';
import { prisma } from '../prisma.js';
import { emitRealtimeEvent } from '../realtime/socket.js';
import { RequestStatus } from '@prisma/client';

export interface ScoreBreakdown {
  criticalityScore: number;
  timeScore: number;
  distanceScore: number;
  scarcityScore: number;
  ageBonus: number;
  finalScore: number;
  weights: PriorityWeights;
  calculatedAt: string;
}

// In-memory active weights (can be updated dynamically by STATE_ADMIN)
let currentWeights: PriorityWeights = { ...DEFAULT_PRIORITY_WEIGHTS };

export function getPriorityWeights(): PriorityWeights {
  return { ...currentWeights };
}

export function updatePriorityWeights(newWeights: Partial<PriorityWeights>): PriorityWeights {
  currentWeights = {
    ...currentWeights,
    ...newWeights,
  };
  return { ...currentWeights };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Computes urgency priority score in range [0, 100] based on Section 5.1 specification:
 * - Patient criticality (1-5) => 45% weight
 * - Time sensitivity (overdue => 100) => 25% weight
 * - Distance to supply (closer supply => easier/faster to fulfil) => 10% weight
 * - Network scarcity (fewer available units network-wide => higher scarcity) => 10% weight
 * - Age bonus (waiting anti-starvation bonus up to 1h) => 10% weight
 */
export function calculatePriorityScore(params: {
  patientCriticality: number; // 1 to 5
  neededBy: Date | string;
  createdAt: Date | string;
  nearestViableProviderKm?: number;
  networkAvailableUnits?: number;
  quantityRequested: number;
  customWeights?: PriorityWeights;
}): { priorityScore: number; breakdown: ScoreBreakdown } {
  const weights = params.customWeights || currentWeights;
  const now = Date.now();
  const neededByMs = new Date(params.neededBy).getTime();
  const createdAtMs = new Date(params.createdAt).getTime();

  // 1. Criticality Score: (patientCriticality / 5) * 100
  const criticalityScore = Math.min(100, Math.max(0, (params.patientCriticality / 5) * 100));

  // 2. Time Score: clamp(1 - (minutesUntilNeededBy / 240), 0, 1) * 100 (4h window; overdue => 100)
  const minutesUntilNeededBy = (neededByMs - now) / (60 * 1000);
  let timeScore = 100;
  if (minutesUntilNeededBy > 0) {
    timeScore = clamp(1 - minutesUntilNeededBy / 240, 0, 1) * 100;
  }

  // 3. Distance Score: clamp(1 - (nearestViableProviderKm / 100), 0, 1) * 100
  const distanceKm = params.nearestViableProviderKm !== undefined ? params.nearestViableProviderKm : 25;
  const distanceScore = clamp(1 - distanceKm / 100, 0, 1) * 100;

  // 4. Scarcity Score: clamp(1 - (networkAvailableUnits / max(quantity*3, 1)), 0, 1) * 100
  const networkUnits = params.networkAvailableUnits !== undefined ? params.networkAvailableUnits : 5;
  const demandThreshold = Math.max(params.quantityRequested * 3, 1);
  const scarcityScore = clamp(1 - networkUnits / demandThreshold, 0, 1) * 100;

  // 5. Age Bonus (Anti-starvation): min(minutesWaiting / 60, 1) * 100
  const minutesWaiting = Math.max(0, (now - createdAtMs) / (60 * 1000));
  const ageBonus = Math.min(minutesWaiting / 60, 1) * 100;

  // Final Weighted Score
  const rawScore =
    weights.criticality * criticalityScore +
    weights.time * timeScore +
    weights.distance * distanceScore +
    weights.scarcity * scarcityScore +
    weights.ageBonus * ageBonus;

  const priorityScore = Math.round(clamp(rawScore, 0, 100) * 100) / 100;

  const breakdown: ScoreBreakdown = {
    criticalityScore: Math.round(criticalityScore * 100) / 100,
    timeScore: Math.round(timeScore * 100) / 100,
    distanceScore: Math.round(distanceScore * 100) / 100,
    scarcityScore: Math.round(scarcityScore * 100) / 100,
    ageBonus: Math.round(ageBonus * 100) / 100,
    finalScore: priorityScore,
    weights,
    calculatedAt: new Date().toISOString(),
  };

  return { priorityScore, breakdown };
}

/**
 * Recomputes priority scores for all active OPEN requests.
 * Broadcasts 'queue:updated' event over Socket.io.
 */
export async function recomputeAllOpenRequests(): Promise<number> {
  const openRequests = await prisma.request.findMany({
    where: { status: RequestStatus.OPEN },
    include: { requesterFacility: true },
  });

  if (openRequests.length === 0) return 0;

  for (const req of openRequests) {
    const { priorityScore, breakdown } = calculatePriorityScore({
      patientCriticality: req.patientCriticality,
      neededBy: req.neededBy,
      createdAt: req.createdAt,
      quantityRequested: req.quantity,
    });

    await prisma.request.update({
      where: { id: req.id },
      data: {
        priorityScore,
        scoreBreakdown: breakdown as any,
        updatedAt: new Date(),
      },
    });
  }

  // Fetch ranked list to broadcast
  const updatedQueue = await prisma.request.findMany({
    where: { status: RequestStatus.OPEN },
    orderBy: { priorityScore: 'desc' },
    include: {
      requesterFacility: true,
      equipmentType: true,
    },
  });

  emitRealtimeEvent('queue:updated', { queue: updatedQueue });
  return openRequests.length;
}
