import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma.js';
import { verifyAuth, requireRole } from '../../middleware/auth.js';
import { createAuditLog } from '../../services/audit.js';
import { emitRealtimeEvent } from '../../realtime/socket.js';

export const facilitiesRouter = Router();

// 1. List all facilities (with optional filtering by type or district)
facilitiesRouter.get('/', async (req: Request, res: Response) => {
  const { type, districtId } = req.query;

  const facilities = await prisma.facility.findMany({
    where: {
      active: true,
      ...(type ? { type: type as any } : {}),
      ...(districtId ? { districtId: String(districtId) } : {}),
    },
    include: {
      district: true,
      _count: {
        select: {
          equipmentUnits: true,
          bloodUnits: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return res.json({ facilities });
});

// 2. Get specific facility details
facilitiesRouter.get('/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const facility = await prisma.facility.findUnique({
    where: { id },
    include: {
      district: true,
      equipmentUnits: {
        include: { equipmentType: true },
      },
      bloodUnits: true,
    },
  });

  if (!facility) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Facility not found' } });
  }

  return res.json({ facility });
});

// 3. Update Facility Share Settings (reserve floors & quiet hours)
facilitiesRouter.patch(
  '/:id/share-settings',
  verifyAuth,
  requireRole('FACILITY_ADMIN', 'BLOOD_BANK', 'STATE_ADMIN'),
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { reserveFloors, quietHoursStart, quietHoursEnd } = req.body;

    const existing = await prisma.facility.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Facility not found' } });
    }

    const updated = await prisma.facility.update({
      where: { id },
      data: {
        reserveFloors: reserveFloors !== undefined ? reserveFloors : (existing.reserveFloors as any),
        quietHoursStart: quietHoursStart !== undefined ? quietHoursStart : existing.quietHoursStart,
        quietHoursEnd: quietHoursEnd !== undefined ? quietHoursEnd : existing.quietHoursEnd,
      },
    });

    await createAuditLog({
      actorId: req.user!.userId,
      action: 'UPDATE_SHARE_SETTINGS',
      entity: 'Facility',
      entityId: id,
      before: { reserveFloors: existing.reserveFloors },
      after: { reserveFloors: updated.reserveFloors },
      ip: req.ip,
    });

    emitRealtimeEvent('facility:settings_changed', { facilityId: id, reserveFloors: updated.reserveFloors }, `facility:${id}`);

    return res.json({ facility: updated });
  }
);
