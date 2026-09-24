import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma.js';
import { verifyAuth, optionalAuth } from '../../middleware/auth.js';
import { createAuditLog } from '../../services/audit.js';
import { emitRealtimeEvent } from '../../realtime/socket.js';
import { getSmsProvider } from '../../providers/sms.js';
import { LogisticsStatus, RequestStatus, EquipmentStatus } from '@prisma/client';
import { getOrCreateTelemetry, recordTelemetryReading, simulateChillerFailure, resetTelemetry } from '../../services/coldChain.js';

export const logisticsRouter = Router();

// 1. List Logistics Jobs (for transport operators and facilities)
logisticsRouter.get('/jobs', optionalAuth, async (req: Request, res: Response) => {
  const { status, transportId } = req.query;

  const jobs = await prisma.logisticsJob.findMany({
    where: {
      ...(status ? { status: status as LogisticsStatus } : {}),
      ...(transportId ? { transportId: String(transportId) } : {}),
    },
    include: {
      allocation: {
        include: {
          request: {
            include: {
              requesterFacility: true,
              equipmentType: true,
            },
          },
          offer: {
            include: {
              providerFacility: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.json({ jobs });
});

// 2. Get Single Job details with timeline
logisticsRouter.get('/jobs/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const job = await prisma.logisticsJob.findUnique({
    where: { id },
    include: {
      allocation: {
        include: {
          request: {
            include: {
              requesterFacility: true,
              equipmentType: true,
            },
          },
          offer: {
            include: {
              providerFacility: true,
            },
          },
        },
      },
    },
  });

  if (!job) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Logistics job not found' } });
  }

  // Calculate elapsed time from request creation to current state
  const requestCreatedAt = new Date(job.allocation.request.createdAt).getTime();
  const allocationAcceptedAt = new Date(job.allocation.acceptedAt).getTime();
  const allocationElapsedSeconds = Math.round((allocationAcceptedAt - requestCreatedAt) / 1000);

  const mins = Math.floor(allocationElapsedSeconds / 60);
  const secs = allocationElapsedSeconds % 60;
  const elapsedFormatted = `${mins}m ${secs}s`;

  return res.json({
    job,
    metrics: {
      allocationElapsedSeconds,
      elapsedFormatted,
    },
  });
});

// 3. Accept Logistics Job (Transport Operator)
logisticsRouter.post('/jobs/:id/accept', verifyAuth, async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const job = await prisma.logisticsJob.findUnique({
    where: { id },
    include: {
      allocation: {
        include: {
          request: { include: { requesterFacility: true, equipmentType: true } },
          offer: { include: { providerFacility: true } },
        },
      },
    },
  });

  if (!job || job.status !== LogisticsStatus.PENDING) {
    return res.status(400).json({ error: { code: 'INVALID_STATUS', message: 'Job is not available for assignment' } });
  }

  const timeline = (job.timeline as any[]) || [];
  timeline.push({
    status: LogisticsStatus.ASSIGNED,
    time: new Date().toISOString(),
    actorName: req.user!.name,
    actorPhone: req.user!.phone,
  });

  const updated = await prisma.logisticsJob.update({
    where: { id },
    data: {
      status: LogisticsStatus.ASSIGNED,
      transportId: req.user!.userId,
      timeline: timeline as any,
    },
  });

  // Notify facilities via SMS and Sockets
  const smsProvider = getSmsProvider();
  await smsProvider.sendSms(
    job.allocation.request.requesterFacility.contactPhone,
    `LifeLink: Ambulance/Transport assigned for your request (${job.allocation.request.equipmentType?.name || 'Blood'}). Driver: ${req.user!.name} (${req.user!.phone}).`
  );

  emitRealtimeEvent('logistics:updated', { job: updated });
  return res.json({ success: true, job: updated });
});

// 4. Update Status (PICKED_UP -> IN_TRANSIT -> DELIVERED -> RETURNED)
logisticsRouter.patch('/jobs/:id/status', verifyAuth, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { status, note } = req.body;

  const job = await prisma.logisticsJob.findUnique({
    where: { id },
    include: {
      allocation: {
        include: {
          request: { include: { requesterFacility: true, equipmentType: true } },
          offer: { include: { providerFacility: true } },
        },
      },
    },
  });

  if (!job) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Logistics job not found' } });
  }

  const timeline = (job.timeline as any[]) || [];
  timeline.push({
    status,
    time: new Date().toISOString(),
    note: note || `Status advanced to ${status}`,
    actorName: req.user!.name,
  });

  const updated = await prisma.logisticsJob.update({
    where: { id },
    data: {
      status: status as LogisticsStatus,
      timeline: timeline as any,
    },
  });

  // If status is DELIVERED, advance Request status to FULFILLED!
  if (status === LogisticsStatus.DELIVERED) {
    await prisma.request.update({
      where: { id: job.allocation.requestId },
      data: { status: RequestStatus.FULFILLED },
    });

    // If equipment, update units to IN_USE
    if (job.allocation.offer.unitIds && Array.isArray(job.allocation.offer.unitIds)) {
      for (const uId of job.allocation.offer.unitIds as string[]) {
        await prisma.equipmentUnit.updateMany({
          where: { id: uId },
          data: { status: EquipmentStatus.IN_USE },
        });
      }
    }

    const smsProvider = getSmsProvider();
    await smsProvider.sendSms(
      job.allocation.request.requesterFacility.contactPhone,
      `LifeLink: Delivery confirmed! ${job.allocation.request.equipmentType?.name || 'Resource'} is now at ${job.allocation.request.requesterFacility.name}. Ready for patient use.`
    );
  }

  await createAuditLog({
    actorId: req.user!.userId,
    action: 'UPDATE_LOGISTICS_STATUS',
    entity: 'LogisticsJob',
    entityId: id,
    after: { status, timelineCount: timeline.length },
    ip: req.ip,
  });

  emitRealtimeEvent('logistics:updated', { job: updated });
  return res.json({ success: true, job: updated });
});

// 5. Submit Equipment Handover Checklist & Digital Signatures
logisticsRouter.post('/jobs/:id/checklist', verifyAuth, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { checklist, senderSign, receiverSign } = req.body;

  const job = await prisma.logisticsJob.findUnique({ where: { id } });
  if (!job) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Logistics job not found' } });
  }

  const updatedChecklist = {
    ...(job.checklist as any),
    ...(checklist || {}),
  };

  const updatedSignatures = {
    ...(job.handoverSignatures as any),
    ...(senderSign ? { senderSign, signedAt: new Date().toISOString() } : {}),
    ...(receiverSign ? { receiverSign, verifiedAt: new Date().toISOString() } : {}),
  };

  const updated = await prisma.logisticsJob.update({
    where: { id },
    data: {
      checklist: updatedChecklist,
      handoverSignatures: updatedSignatures,
    },
  });

  emitRealtimeEvent('logistics:checklist_updated', { job: updated });
  return res.json({ success: true, job: updated });
});

// 6. SMS Simulator Feed (List Outbound Messages)
logisticsRouter.get('/sms/outbox', async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string, 10) || 50;

  const messages = await prisma.smsOutbox.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return res.json({ count: messages.length, messages });
});

// 7. IoT Cold-Chain Telemetry & Exception Routing
logisticsRouter.get('/jobs/:id/telemetry', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { cargo } = req.query;
  const telemetry = getOrCreateTelemetry(id, typeof cargo === 'string' ? cargo : undefined);
  return res.json({ telemetry });
});

logisticsRouter.post('/jobs/:id/telemetry', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const reading = req.body || {};
  const updated = await recordTelemetryReading(id, reading);
  return res.json({ success: true, telemetry: updated });
});

logisticsRouter.post('/jobs/:id/simulate-chiller-failure', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const updated = await simulateChillerFailure(id);
  return res.json({ success: true, telemetry: updated });
});

logisticsRouter.post('/jobs/:id/reset-telemetry', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const reset = resetTelemetry(id);
  return res.json({ success: true, telemetry: reset });
});


