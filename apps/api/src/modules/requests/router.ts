import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma.js';
import { verifyAuth, optionalAuth } from '../../middleware/auth.js';
import { createRequestSchema } from '@lifelink/shared';
import { calculatePriorityScore, recomputeAllOpenRequests } from '../../services/priority.js';
import { matchAndCreateOffers } from '../../services/matching.js';
import { createAuditLog } from '../../services/audit.js';
import { emitRealtimeEvent } from '../../realtime/socket.js';
import { RequestStatus, OfferStatus, LogisticsStatus, LogisticsType, EquipmentStatus } from '@prisma/client';

export const requestsRouter = Router();

// 1. Create a new Resource Request
requestsRouter.post('/', verifyAuth, async (req: Request, res: Response) => {
  const parsed = createRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data or privacy violation detected',
        details: parsed.error.format(),
      },
    });
  }

  const data = parsed.data;
  const neededBy = new Date(data.neededBy);
  const now = new Date();

  // Compute urgency priority score & explainability breakdown
  const { priorityScore, breakdown } = calculatePriorityScore({
    patientCriticality: data.patientCriticality,
    neededBy,
    createdAt: now,
    quantityRequested: data.quantity,
  });

  const createdRequest = await prisma.request.create({
    data: {
      kind: data.kind as any,
      requesterFacilityId: data.requesterFacilityId,
      createdById: req.user!.userId,
      equipmentTypeId: data.equipmentTypeId || null,
      bloodGroup: data.bloodGroup ? (data.bloodGroup.replace('+', '_POS').replace('-', '_NEG') as any) : null,
      bloodComponent: data.bloodComponent ? (data.bloodComponent as any) : null,
      quantity: data.quantity,
      patientCriticality: data.patientCriticality,
      timeSensitivityMins: data.timeSensitivityMins,
      neededBy,
      patientSummary: data.patientSummary,
      status: RequestStatus.OPEN,
      priorityScore,
      scoreBreakdown: breakdown as any,
    },
    include: {
      requesterFacility: true,
      equipmentType: true,
    },
  });

  await createAuditLog({
    actorId: req.user!.userId,
    action: 'CREATE_REQUEST',
    entity: 'Request',
    entityId: createdRequest.id,
    after: createdRequest,
    ip: req.ip,
  });

  // Automatically find matching providers & create top offers
  const offers = await matchAndCreateOffers(createdRequest.id);

  emitRealtimeEvent('request:created', { request: createdRequest, offers });
  await recomputeAllOpenRequests();

  return res.status(201).json({ request: createdRequest, offersCount: offers.length });
});

// 2. List Requests (with filters and sorting by priorityScore)
requestsRouter.get('/', optionalAuth, async (req: Request, res: Response) => {
  const { scope, facilityId, status, kind } = req.query;

  const whereClause: any = {};

  if (status) {
    whereClause.status = status as RequestStatus;
  }

  if (kind) {
    whereClause.kind = kind as any;
  }

  if (scope === 'open') {
    whereClause.status = RequestStatus.OPEN;
  } else if (scope === 'outgoing' && facilityId) {
    whereClause.requesterFacilityId = String(facilityId);
  }

  const requests = await prisma.request.findMany({
    where: whereClause,
    include: {
      requesterFacility: true,
      equipmentType: true,
      offers: {
        include: { providerFacility: true },
      },
      allocations: true,
    },
    orderBy: { priorityScore: 'desc' },
  });

  return res.json({ requests });
});

// 3. Get single Request details
requestsRouter.get('/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      requesterFacility: true,
      equipmentType: true,
      offers: {
        include: { providerFacility: true },
      },
      allocations: {
        include: { logisticsJobs: true },
      },
      donorPledges: {
        include: { donor: { include: { user: true } } },
      },
    },
  });

  if (!request) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Request not found' } });
  }

  return res.json({ request });
});

// 4. Cancel Request
requestsRouter.post('/:id/cancel', verifyAuth, async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const request = await prisma.request.findUnique({ where: { id } });
  if (!request) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Request not found' } });
  }

  const updated = await prisma.request.update({
    where: { id },
    data: { status: RequestStatus.CANCELLED },
  });

  // Expire all proposed offers
  await prisma.offer.updateMany({
    where: { requestId: id, status: OfferStatus.PROPOSED },
    data: { status: OfferStatus.EXPIRED },
  });

  await createAuditLog({
    actorId: req.user!.userId,
    action: 'CANCEL_REQUEST',
    entity: 'Request',
    entityId: id,
    ip: req.ip,
  });

  emitRealtimeEvent('request:cancelled', { requestId: id });
  await recomputeAllOpenRequests();

  return res.json({ request: updated });
});

// 5. Accept Offer (Wins allocation, creates logistics jobs)
requestsRouter.post('/offers/:id/accept', verifyAuth, async (req: Request, res: Response) => {
  const offerId = req.params.id as string;

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { request: true, providerFacility: true },
  });

  if (!offer || offer.status !== OfferStatus.PROPOSED) {
    return res.status(400).json({ error: { code: 'INVALID_OFFER', message: 'Offer is no longer available or already resolved' } });
  }

  // A. Mark this offer ACCEPTED
  const acceptedOffer = await prisma.offer.update({
    where: { id: offerId },
    data: { status: OfferStatus.ACCEPTED },
  });

  // B. Mark other offers for this request as DECLINED/EXPIRED
  await prisma.offer.updateMany({
    where: {
      requestId: offer.requestId,
      id: { not: offerId },
      status: OfferStatus.PROPOSED,
    },
    data: { status: OfferStatus.EXPIRED },
  });

  // C. Update request status to MATCHED
  const updatedRequest = await prisma.request.update({
    where: { id: offer.requestId },
    data: { status: RequestStatus.MATCHED },
  });

  // D. Create Allocation
  const allocation = await prisma.allocation.create({
    data: {
      requestId: offer.requestId,
      offerId,
      status: 'ACTIVE',
    },
  });

  // E. Create LogisticsJob for PICKUP
  const pickupJob = await prisma.logisticsJob.create({
    data: {
      allocationId: allocation.id,
      type: LogisticsType.PICKUP,
      status: LogisticsStatus.PENDING,
      checklist: {
        'Power cable & adapter included': false,
        'Patient breathing circuits included': false,
        'Bacterial/viral filters attached': false,
        'Battery charged > 80%': false,
        'Calibration self-test passed': false,
      },
      timeline: [
        { status: 'PENDING', time: new Date().toISOString(), note: 'Logistics job created' },
      ],
    },
  });

  // If equipment, mark the allocated units RESERVED
  if (offer.unitIds && Array.isArray(offer.unitIds)) {
    for (const uId of offer.unitIds as string[]) {
      await prisma.equipmentUnit.updateMany({
        where: { id: uId },
        data: { status: EquipmentStatus.RESERVED },
      });
    }
  }

  await createAuditLog({
    actorId: req.user!.userId,
    action: 'ACCEPT_OFFER',
    entity: 'Offer',
    entityId: offerId,
    after: { allocationId: allocation.id, pickupJobId: pickupJob.id },
    ip: req.ip,
  });

  emitRealtimeEvent('offer:resolved', {
    offer: acceptedOffer,
    request: updatedRequest,
    allocation,
    pickupJob,
  });

  return res.json({
    success: true,
    offer: acceptedOffer,
    request: updatedRequest,
    allocation,
    logisticsJob: pickupJob,
  });
});

// 6. Decline Offer
requestsRouter.post('/offers/:id/decline', verifyAuth, async (req: Request, res: Response) => {
  const offerId = req.params.id as string;

  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Offer not found' } });
  }

  const updated = await prisma.offer.update({
    where: { id: offerId },
    data: { status: OfferStatus.DECLINED },
  });

  await createAuditLog({
    actorId: req.user!.userId,
    action: 'DECLINE_OFFER',
    entity: 'Offer',
    entityId: offerId,
    ip: req.ip,
  });

  emitRealtimeEvent('offer:declined', { offerId, requestId: offer.requestId });
  return res.json({ success: true, offer: updated });
});
