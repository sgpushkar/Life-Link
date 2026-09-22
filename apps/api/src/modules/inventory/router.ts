import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma.js';
import { verifyAuth, requireRole } from '../../middleware/auth.js';
import { createAuditLog } from '../../services/audit.js';
import { emitRealtimeEvent } from '../../realtime/socket.js';
import { EquipmentStatus, BloodGroup, BloodComponent, BloodUnitStatus } from '@prisma/client';

export const inventoryRouter = Router();

// 1. Get complete inventory for a facility (Equipment + Blood)
inventoryRouter.get('/facilities/:id/inventory', async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const facility = await prisma.facility.findUnique({
    where: { id },
  });

  if (!facility) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Facility not found' } });
  }

  const equipmentUnits = await prisma.equipmentUnit.findMany({
    where: { facilityId: id },
    include: { equipmentType: true },
    orderBy: { updatedAt: 'desc' },
  });

  const bloodUnits = await prisma.bloodUnit.findMany({
    where: {
      facilityId: id,
      status: { notIn: [BloodUnitStatus.DISCARDED, BloodUnitStatus.ISSUED] },
    },
    orderBy: { expiresAt: 'asc' },
  });

  // Aggregate equipment by type
  const equipmentByType: Record<string, any> = {};
  for (const unit of equipmentUnits) {
    const code = unit.equipmentType.code;
    if (!equipmentByType[code]) {
      equipmentByType[code] = {
        typeId: unit.typeId,
        code,
        name: unit.equipmentType.name,
        unit: unit.equipmentType.unit,
        total: 0,
        available: 0,
        inUse: 0,
        reserved: 0,
        maintenance: 0,
        onLoan: 0,
        shareable: 0,
        lastUpdated: unit.updatedAt,
        units: [],
      };
    }

    const group = equipmentByType[code];
    group.total += 1;
    group.units.push(unit);
    if (unit.status === EquipmentStatus.AVAILABLE) {
      group.available += 1;
      if (unit.shareable) group.shareable += 1;
    } else if (unit.status === EquipmentStatus.IN_USE) {
      group.inUse += 1;
    } else if (unit.status === EquipmentStatus.RESERVED) {
      group.reserved += 1;
    } else if (unit.status === EquipmentStatus.MAINTENANCE) {
      group.maintenance += 1;
    } else if (unit.status === EquipmentStatus.ON_LOAN) {
      group.onLoan += 1;
    }

    if (new Date(unit.updatedAt) > new Date(group.lastUpdated)) {
      group.lastUpdated = unit.updatedAt;
    }
  }

  // Aggregate blood units by blood group & component
  const now = new Date();
  const expiring72hThreshold = new Date(now.getTime() + 72 * 60 * 60 * 1000);

  const bloodByGroup: Record<string, any> = {};
  let totalBloodUnits = 0;
  let expiringSoonCount = 0;

  for (const bUnit of bloodUnits) {
    const key = `${bUnit.bloodGroup}_${bUnit.component}`;
    if (!bloodByGroup[key]) {
      bloodByGroup[key] = {
        bloodGroup: bUnit.bloodGroup,
        component: bUnit.component,
        available: 0,
        reserved: 0,
        expired: 0,
        expiringSoon: 0,
        units: [],
      };
    }

    const group = bloodByGroup[key];
    group.units.push(bUnit);

    if (bUnit.status === BloodUnitStatus.AVAILABLE) {
      group.available += 1;
      totalBloodUnits += 1;
      if (new Date(bUnit.expiresAt) <= expiring72hThreshold && new Date(bUnit.expiresAt) > now) {
        group.expiringSoon += 1;
        expiringSoonCount += 1;
      }
    } else if (bUnit.status === BloodUnitStatus.RESERVED) {
      group.reserved += 1;
    } else if (bUnit.status === BloodUnitStatus.EXPIRED) {
      group.expired += 1;
    }
  }

  return res.json({
    facilityId: facility.id,
    facilityName: facility.name,
    reserveFloors: facility.reserveFloors,
    equipment: Object.values(equipmentByType),
    blood: {
      totalAvailable: totalBloodUnits,
      expiringSoon: expiringSoonCount,
      matrix: Object.values(bloodByGroup),
      units: bloodUnits,
    },
  });
});

// 2. One-tap Equipment Stepper / Bulk Status Update
inventoryRouter.patch(
  '/facilities/:id/inventory/equipment',
  verifyAuth,
  requireRole('FACILITY_ADMIN', 'STATE_ADMIN'),
  async (req: Request, res: Response) => {
    const facilityId = req.params.id as string;
    const { action, typeCode, unitId, status, shareable } = req.body;

    // A. Single Unit update
    if (unitId) {
      const existing = await prisma.equipmentUnit.findUnique({ where: { id: String(unitId) } });
      if (!existing || existing.facilityId !== facilityId) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Equipment unit not found' } });
      }

      const updated = await prisma.equipmentUnit.update({
        where: { id: String(unitId) },
        data: {
          status: status !== undefined ? (status as EquipmentStatus) : existing.status,
          shareable: shareable !== undefined ? Boolean(shareable) : existing.shareable,
          updatedAt: new Date(),
        },
        include: { equipmentType: true },
      });

      await createAuditLog({
        actorId: req.user!.userId,
        action: 'UPDATE_EQUIPMENT_UNIT',
        entity: 'EquipmentUnit',
        entityId: String(unitId),
        before: { status: existing.status, shareable: existing.shareable },
        after: { status: updated.status, shareable: updated.shareable },
        ip: req.ip,
      });

      emitRealtimeEvent('inventory:changed', { facilityId, unit: updated }, `facility:${facilityId}`);
      return res.json({ unit: updated });
    }

    // B. One-Tap Quick Stepper (Action: INCREMENT_AVAILABLE or DECREMENT_AVAILABLE)
    if (action && typeCode) {
      const eqType = await prisma.equipmentType.findUnique({ where: { code: String(typeCode) } });
      if (!eqType) {
        return res.status(400).json({ error: { code: 'INVALID_TYPE', message: 'Invalid equipment type code' } });
      }

      if (action === 'INCREMENT_AVAILABLE') {
        // Find an IN_USE unit to free up, OR create a new unit
        const inUseUnit = await prisma.equipmentUnit.findFirst({
          where: { facilityId, typeId: eqType.id, status: EquipmentStatus.IN_USE },
        });

        let modifiedUnit;
        if (inUseUnit) {
          modifiedUnit = await prisma.equipmentUnit.update({
            where: { id: inUseUnit.id },
            data: { status: EquipmentStatus.AVAILABLE, updatedAt: new Date() },
          });
        } else {
          const count = await prisma.equipmentUnit.count({ where: { facilityId, typeId: eqType.id } });
          modifiedUnit = await prisma.equipmentUnit.create({
            data: {
              facilityId,
              typeId: eqType.id,
              assetTag: `${String(typeCode).substring(0, 4)}-${Date.now().toString().slice(-4)}-${count + 1}`,
              status: EquipmentStatus.AVAILABLE,
              shareable: true,
            },
          });
        }

        emitRealtimeEvent('inventory:changed', { facilityId, typeCode, action }, `facility:${facilityId}`);
        return res.json({ success: true, unit: modifiedUnit });
      }

      if (action === 'DECREMENT_AVAILABLE') {
        const availableUnit = await prisma.equipmentUnit.findFirst({
          where: { facilityId, typeId: eqType.id, status: EquipmentStatus.AVAILABLE },
        });

        if (!availableUnit) {
          return res.status(400).json({
            error: { code: 'NO_AVAILABLE_UNITS', message: `No available ${typeCode} to mark in-use` },
          });
        }

        const modifiedUnit = await prisma.equipmentUnit.update({
          where: { id: availableUnit.id },
          data: { status: EquipmentStatus.IN_USE, updatedAt: new Date() },
        });

        emitRealtimeEvent('inventory:changed', { facilityId, typeCode, action }, `facility:${facilityId}`);
        return res.json({ success: true, unit: modifiedUnit });
      }
    }

    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Provide unitId or action + typeCode' } });
  }
);

// 3. Add Blood Unit (Blood Bank or Camp Intake)
inventoryRouter.post(
  '/facilities/:id/blood-units',
  verifyAuth,
  requireRole('BLOOD_BANK', 'STATE_ADMIN'),
  async (req: Request, res: Response) => {
    const facilityId = req.params.id as string;
    const { bloodGroup, component, collectedAt, expiresAt } = req.body;

    if (!bloodGroup || !component) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Blood group and component required' } });
    }

    const unit = await prisma.bloodUnit.create({
      data: {
        facilityId,
        bloodGroup: bloodGroup as BloodGroup,
        component: component as BloodComponent,
        collectedAt: collectedAt ? new Date(collectedAt) : new Date(),
        expiresAt: expiresAt
          ? new Date(expiresAt)
          : new Date(Date.now() + 35 * 24 * 60 * 60 * 1000), // Default 35-day shelf life for PRBC
        status: BloodUnitStatus.AVAILABLE,
      },
    });

    await createAuditLog({
      actorId: req.user!.userId,
      action: 'ADD_BLOOD_UNIT',
      entity: 'BloodUnit',
      entityId: unit.id,
      after: unit,
      ip: req.ip,
    });

    emitRealtimeEvent('inventory:changed', { facilityId, bloodUnit: unit }, `facility:${facilityId}`);
    return res.status(201).json({ unit });
  }
);
