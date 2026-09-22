import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma.js';
import { haversineDistance, calculateETA, getCompatibleDonorGroups, isUnitViableForTransit } from '@lifelink/shared';
import { EquipmentStatus, BloodUnitStatus, BloodGroup, BloodComponent } from '@prisma/client';

export const searchRouter = Router();

searchRouter.get('/resources', async (req: Request, res: Response) => {
  const {
    type, // e.g. 'OXYGEN_CONCENTRATOR' | 'VENTILATOR'
    bloodGroup, // e.g. 'B_POS' or 'B+'
    component, // e.g. 'PRBC' | 'WHOLE'
    lat,
    lng,
    radiusKm = '50',
    qty = '1',
    requesterFacilityId,
  } = req.query;

  const targetLat = lat ? parseFloat(lat as string) : 19.2403; // Default Kalyan PHC if unspecified
  const targetLng = lng ? parseFloat(lng as string) : 73.1305;
  const maxRadius = parseFloat(radiusKm as string);
  const requestedQty = parseInt(qty as string, 10) || 1;

  const now = new Date();

  // 1. Search for Equipment
  if (type) {
    const eqType = await prisma.equipmentType.findUnique({
      where: { code: String(type) },
    });

    if (!eqType) {
      return res.status(404).json({ error: { code: 'TYPE_NOT_FOUND', message: `Equipment type '${type}' not found` } });
    }

    // Find all facilities with equipment of this type
    const facilities = await prisma.facility.findMany({
      where: {
        active: true,
        ...(requesterFacilityId ? { id: { not: String(requesterFacilityId) } } : {}),
      },
      include: {
        district: true,
        equipmentUnits: {
          where: {
            typeId: eqType.id,
            status: EquipmentStatus.AVAILABLE,
            shareable: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    const results = [];

    for (const fac of facilities) {
      const distance = haversineDistance(targetLat, targetLng, fac.lat, fac.lng);
      if (distance > maxRadius) continue;

      const etaMins = calculateETA(distance);
      const totalAvailable = fac.equipmentUnits.length;

      // Check reserve floor
      const reserveFloors = (fac.reserveFloors as Record<string, number>) || {};
      const floor = reserveFloors[String(type)] || 0;
      const shareableQuantity = Math.max(0, totalAvailable - floor);

      if (shareableQuantity <= 0) continue;

      // Determine freshness
      const latestUpdate = fac.equipmentUnits[0]?.updatedAt || fac.updatedAt;
      const minutesAgo = Math.floor((now.getTime() - new Date(latestUpdate).getTime()) / (60 * 1000));

      let freshness: 'fresh' | 'moderate' | 'stale' = 'fresh';
      if (minutesAgo > 120) {
        freshness = 'stale'; // > 2 hours
      } else if (minutesAgo > 15) {
        freshness = 'moderate'; // 15m - 2h
      }

      results.push({
        facility: {
          id: fac.id,
          name: fac.name,
          type: fac.type,
          address: fac.address,
          contactPhone: fac.contactPhone,
          lat: fac.lat,
          lng: fac.lng,
          district: fac.district.name,
        },
        resource: {
          code: eqType.code,
          name: eqType.name,
          unit: eqType.unit,
        },
        availableUnits: totalAvailable,
        reserveFloor: floor,
        shareableQuantity,
        distanceKm: distance,
        etaMins,
        freshness,
        minutesAgo,
        lastUpdated: latestUpdate,
        units: fac.equipmentUnits.slice(0, shareableQuantity),
      });
    }

    results.sort((a, b) => a.etaMins - b.etaMins);
    return res.json({ count: results.length, radiusKm: maxRadius, results });
  }

  // 2. Search for Blood
  if (bloodGroup && component) {
    const rawGroup = (bloodGroup as string).replace('+', '_POS').replace('-', '_NEG') as BloodGroup;
    const comp = component as BloodComponent;

    const compatibleGroups = getCompatibleDonorGroups(
      (bloodGroup as string).replace('_POS', '+').replace('_NEG', '-') as any,
      comp as any
    ).map((g) => g.replace('+', '_POS').replace('-', '_NEG') as BloodGroup);

    const bloodBanks = await prisma.facility.findMany({
      where: {
        active: true,
        ...(requesterFacilityId ? { id: { not: String(requesterFacilityId) } } : {}),
      },
      include: {
        district: true,
        bloodUnits: {
          where: {
            bloodGroup: { in: compatibleGroups },
            component: comp,
            status: BloodUnitStatus.AVAILABLE,
          },
          orderBy: { expiresAt: 'asc' }, // FEFO ordering
        },
      },
    });

    const results = [];

    for (const fac of bloodBanks) {
      const distance = haversineDistance(targetLat, targetLng, fac.lat, fac.lng);
      if (distance > maxRadius) continue;

      const etaMins = calculateETA(distance);

      // Filter viable units considering FEFO and transit time + 6h safety margin
      const viableUnits = fac.bloodUnits.filter((u) =>
        isUnitViableForTransit(u.expiresAt, etaMins, 6)
      );

      // Check reserve floor for this group
      const reserveFloors = (fac.reserveFloors as Record<string, number>) || {};
      const bgSymbol = (bloodGroup as string).replace('_POS', '+').replace('_NEG', '-');
      const floor = reserveFloors[bgSymbol] || 0;
      const shareableQuantity = Math.max(0, viableUnits.length - floor);

      if (shareableQuantity <= 0) continue;

      const latestUpdate = viableUnits[0]?.updatedAt || fac.updatedAt;
      const minutesAgo = Math.floor((now.getTime() - new Date(latestUpdate).getTime()) / (60 * 1000));

      let freshness: 'fresh' | 'moderate' | 'stale' = 'fresh';
      if (minutesAgo > 120) freshness = 'stale';
      else if (minutesAgo > 15) freshness = 'moderate';

      results.push({
        facility: {
          id: fac.id,
          name: fac.name,
          type: fac.type,
          address: fac.address,
          contactPhone: fac.contactPhone,
          lat: fac.lat,
          lng: fac.lng,
          district: fac.district.name,
        },
        resource: {
          bloodGroup: rawGroup,
          component: comp,
        },
        availableUnits: viableUnits.length,
        reserveFloor: floor,
        shareableQuantity,
        distanceKm: distance,
        etaMins,
        freshness,
        minutesAgo,
        lastUpdated: latestUpdate,
        units: viableUnits.slice(0, shareableQuantity),
      });
    }

    results.sort((a, b) => a.etaMins - b.etaMins);
    return res.json({ count: results.length, radiusKm: maxRadius, results });
  }

  return res.status(400).json({
    error: {
      code: 'MISSING_QUERY',
      message: 'Provide either `type` for equipment or `bloodGroup` and `component` for blood',
    },
  });
});
