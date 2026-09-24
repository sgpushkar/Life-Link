import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma.js';
import { verifyAuth, requireRole } from '../../middleware/auth.js';
import { getPriorityWeights, updatePriorityWeights, calculatePriorityScore, recomputeAllOpenRequests } from '../../services/priority.js';
import { createAuditLog } from '../../services/audit.js';
import { emitRealtimeEvent } from '../../realtime/socket.js';
import { RequestKind, RequestStatus } from '@prisma/client';
import { getActiveDisasterScenario, setDisasterScenario } from '../../services/disaster.js';
import { DisasterScenarioId } from '@lifelink/shared';

export const adminRouter = Router();

// 1. Get current priority weights
adminRouter.get('/priority-weights', (_req: Request, res: Response) => {
  return res.json({ weights: getPriorityWeights() });
});

// 2. Update priority weights (STATE_ADMIN only)
adminRouter.put(
  '/priority-weights',
  verifyAuth,
  requireRole('STATE_ADMIN'),
  async (req: Request, res: Response) => {
    const { weights } = req.body;
    if (!weights) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Weights object required' } });
    }

    const previous = getPriorityWeights();
    const updated = updatePriorityWeights(weights);

    await createAuditLog({
      actorId: req.user!.userId,
      action: 'UPDATE_PRIORITY_WEIGHTS',
      entity: 'SystemConfig',
      entityId: 'PRIORITY_WEIGHTS',
      before: previous,
      after: updated,
      ip: req.ip,
    });

    await recomputeAllOpenRequests();
    emitRealtimeEvent('weights:updated', { weights: updated });

    return res.json({ success: true, weights: updated });
  }
);

// 3. Simulate Surge: Generates N synthetic high-urgency requests
adminRouter.post('/simulate/surge', async (req: Request, res: Response) => {
  const count = parseInt(req.body?.count || '5', 10);

  const facilities = await prisma.facility.findMany({
    where: { type: 'PHC' },
    take: 4,
  });

  const eqTypes = await prisma.equipmentType.findMany();
  const demoUser = await prisma.user.findFirst({ where: { role: 'FACILITY_ADMIN' } });

  if (!demoUser || facilities.length === 0 || eqTypes.length === 0) {
    return res.status(400).json({ error: { code: 'PRECONDITIONS_FAILED', message: 'Seed data needed for surge' } });
  }

  const createdSurgeRequests = [];
  const now = Date.now();

  const conditions = [
    'Mass casualty incident on NH-848: multiple blunt trauma & hypoxia',
    'Post-flood waterborne sepsis outbreak with respiratory compromise',
    'Flash organophosphorus poisoning requiring emergency mechanical ventilation',
    'Sudden obstetric emergency with fetal distress and maternal desaturation',
    'Acute pulmonary edema secondary to severe congestive cardiac failure',
  ];

  for (let i = 0; i < count; i++) {
    const fac = facilities[i % facilities.length];
    const eq = eqTypes[i % eqTypes.length];
    const criticality = 4 + (i % 2); // Criticality 4 or 5!
    const minsNeeded = 15 + i * 15; // 15m, 30m, 45m...
    const neededBy = new Date(now + minsNeeded * 60 * 1000);

    const { priorityScore, breakdown } = calculatePriorityScore({
      patientCriticality: criticality,
      neededBy,
      createdAt: new Date(),
      quantityRequested: 1,
    });

    const surgeReq = await prisma.request.create({
      data: {
        kind: RequestKind.EQUIPMENT,
        requesterFacilityId: fac.id,
        createdById: demoUser.id,
        equipmentTypeId: eq.id,
        quantity: 1,
        patientCriticality: criticality,
        timeSensitivityMins: minsNeeded,
        neededBy,
        patientSummary: {
          ageBand: i % 2 === 0 ? 'ADULT' : 'ELDERLY',
          sex: i % 2 === 0 ? 'MALE' : 'FEMALE',
          condition: `[SURGE SIMULATION #${i + 1}] ${conditions[i % conditions.length]}`,
        },
        status: RequestStatus.OPEN,
        priorityScore,
        scoreBreakdown: breakdown as any,
      },
      include: {
        requesterFacility: true,
        equipmentType: true,
      },
    });

    createdSurgeRequests.push(surgeReq);
  }

  // Recompute queue with newly injected surge requests
  await recomputeAllOpenRequests();

  emitRealtimeEvent('surge:triggered', { count: createdSurgeRequests.length });

  return res.json({
    success: true,
    message: `Injected ${createdSurgeRequests.length} simulated surge requests. Queue dynamically re-ranked!`,
    requests: createdSurgeRequests,
  });
});

// 4. Reset Surge: Removes simulated requests
adminRouter.post('/simulate/reset', async (_req: Request, res: Response) => {
  const deleted = await prisma.request.deleteMany({
    where: {
      patientSummary: {
        path: ['condition'],
        string_contains: '[SURGE SIMULATION',
      },
    },
  });

  await recomputeAllOpenRequests();
  emitRealtimeEvent('surge:reset', {});

  return res.json({
    success: true,
    message: `Cleaned up ${deleted.count} simulated requests. Queue normalized.`,
  });
});

// 5. Global Crisis Simulator (WHO EMT Disaster Presets)
adminRouter.get('/disaster-scenario', (_req: Request, res: Response) => {
  const scenario = getActiveDisasterScenario();
  return res.json({ scenario });
});

adminRouter.post('/disaster-scenario', async (req: Request, res: Response) => {
  const { scenarioId } = req.body;
  if (!scenarioId) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'scenarioId required' } });
  }

  const updated = await setDisasterScenario(scenarioId as DisasterScenarioId);
  return res.json({ success: true, scenario: updated });
});

