import {
  DisasterScenarioId,
  DisasterScenarioConfig,
  DISASTER_SCENARIOS,
} from '@lifelink/shared';
import { prisma } from '../prisma.js';
import { emitRealtimeEvent } from '../realtime/socket.js';
import { calculatePriorityScore, recomputeAllOpenRequests } from './priority.js';
import { RequestKind, RequestStatus } from '@prisma/client';

let activeScenarioId: DisasterScenarioId = 'BASELINE';

export function getActiveDisasterScenario(): DisasterScenarioConfig {
  return DISASTER_SCENARIOS[activeScenarioId] || DISASTER_SCENARIOS.BASELINE;
}

export async function setDisasterScenario(scenarioId: DisasterScenarioId): Promise<DisasterScenarioConfig> {
  const config = DISASTER_SCENARIOS[scenarioId] || DISASTER_SCENARIOS.BASELINE;
  activeScenarioId = scenarioId;

  // Clean up any existing disaster simulated requests & generate disaster volume
  try {
    await prisma.request.deleteMany({
      where: {
        patientSummary: {
          path: ['condition'],
          string_contains: '[GLOBAL DISASTER',
        },
      },
    });

    if (scenarioId !== 'BASELINE') {
      const facilities = await prisma.facility.findMany({ where: { active: true } });
      const demoUser = await prisma.user.findFirst({ where: { role: 'FACILITY_ADMIN' } });
      const eqTypes = await prisma.equipmentType.findMany();

      if (demoUser && facilities.length > 0) {
        const now = Date.now();
        const count = scenarioId === 'EARTHQUAKE_74' ? 12 : scenarioId === 'CYCLONE_FLOOD' ? 8 : 10;

        for (let i = 0; i < count; i++) {
          const fac = facilities[i % facilities.length];
          const minsNeeded = 10 + i * 8; // acute window: 10m to 74m
          const neededBy = new Date(now + minsNeeded * 60 * 1000);
          const criticality = 5; // Maximum triage level

          const { priorityScore, breakdown } = calculatePriorityScore({
            patientCriticality: criticality,
            neededBy,
            createdAt: new Date(),
            quantityRequested: 1,
          });

          const isBlood = i % 2 === 1;
          const eq = eqTypes[i % eqTypes.length];

          await prisma.request.create({
            data: {
              kind: isBlood ? RequestKind.BLOOD : RequestKind.EQUIPMENT,
              requesterFacilityId: fac.id,
              createdById: demoUser.id,
              equipmentTypeId: isBlood ? null : eq?.id,
              bloodGroup: isBlood ? (i % 4 === 0 ? 'O-' : 'B+') as any : null,
              bloodComponent: isBlood ? (i % 2 === 0 ? 'PRBC' : 'PLASMA') as any : null,
              quantity: isBlood ? 2 : 1,
              patientCriticality: criticality,
              timeSensitivityMins: minsNeeded,
              neededBy,
              patientSummary: {
                ageBand: i % 3 === 0 ? 'CHILD' : i % 2 === 0 ? 'ADULT' : 'ELDERLY',
                sex: i % 2 === 0 ? 'FEMALE' : 'MALE',
                condition: `[GLOBAL DISASTER: ${config.title}] Acute mass casualty trauma: Hypoxia, crush injury, severe blood loss.`,
              },
              status: RequestStatus.OPEN,
              priorityScore,
              scoreBreakdown: breakdown as any,
            },
          });
        }
      }
    }

    // Recompute queue with new or cleared disaster priority requests
    await recomputeAllOpenRequests();
  } catch (_e) {
    // Database-less / test environment fallback
  }


  emitRealtimeEvent('disaster:scenario_changed', {
    scenario: config,
  });

  return config;
}
