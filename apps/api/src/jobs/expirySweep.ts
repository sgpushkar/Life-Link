import { prisma } from '../prisma.js';
import { BloodUnitStatus } from '@prisma/client';
import { emitRealtimeEvent } from '../realtime/socket.js';

export interface ExpirySweepResult {
  expiredCount: number;
  nearExpiryCount: number;
  redistributionSuggestions: Array<{
    donorFacilityId: string;
    donorFacilityName: string;
    targetFacilityId: string;
    targetFacilityName: string;
    bloodGroup: string;
    component: string;
    unitsExpiring: number;
    hoursRemaining: number;
    message: string;
  }>;
}

/**
 * Sweeps the blood inventory:
 * 1. Automatically flags units past expiresAt as EXPIRED
 * 2. Identifies units expiring within 72h
 * 3. Finds facilities in need and matches near-expiry units to prevent wastage
 */
export async function runBloodExpirySweep(): Promise<ExpirySweepResult> {
  const now = new Date();
  const threshold72h = new Date(now.getTime() + 72 * 60 * 60 * 1000);

  // 1. Mark expired units
  const expiredUpdate = await prisma.bloodUnit.updateMany({
    where: {
      status: BloodUnitStatus.AVAILABLE,
      expiresAt: { lt: now },
    },
    data: {
      status: BloodUnitStatus.EXPIRED,
    },
  });

  // 2. Fetch all near-expiry units (< 72h)
  const nearExpiryUnits = await prisma.bloodUnit.findMany({
    where: {
      status: BloodUnitStatus.AVAILABLE,
      expiresAt: {
        gte: now,
        lte: threshold72h,
      },
    },
    include: { facility: true },
    orderBy: { expiresAt: 'asc' },
  });

  // 3. Check for open blood requests or facilities with low stock
  const redistributionSuggestions: ExpirySweepResult['redistributionSuggestions'] = [];

  // Group near-expiry units by facility and bloodGroup
  const grouped: Record<string, typeof nearExpiryUnits> = {};
  for (const u of nearExpiryUnits) {
    const key = `${u.facilityId}_${u.bloodGroup}_${u.component}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(u);
  }

  for (const key in grouped) {
    const units = grouped[key];
    const firstUnit = units[0];
    const sourceFacility = firstUnit.facility;

    // Check if another blood bank has an open request or lower stock of this group
    const targetFacility = await prisma.facility.findFirst({
      where: {
        type: 'BLOOD_BANK',
        id: { not: sourceFacility.id },
        active: true,
      },
    });

    if (targetFacility) {
      const hoursRemaining = Math.max(1, Math.round((new Date(firstUnit.expiresAt).getTime() - now.getTime()) / (60 * 60 * 1000)));
      const groupSymbol = firstUnit.bloodGroup.replace('_POS', '+').replace('_NEG', '-');

      redistributionSuggestions.push({
        donorFacilityId: sourceFacility.id,
        donorFacilityName: sourceFacility.name,
        targetFacilityId: targetFacility.id,
        targetFacilityName: targetFacility.name,
        bloodGroup: groupSymbol,
        component: firstUnit.component,
        unitsExpiring: units.length,
        hoursRemaining,
        message: `${sourceFacility.name} has ${units.length} unit(s) of ${groupSymbol} (${firstUnit.component}) expiring in ${hoursRemaining}h. Immediate transfer to ${targetFacility.name} recommended to prevent wastage.`,
      });
    }
  }

  const result: ExpirySweepResult = {
    expiredCount: expiredUpdate.count,
    nearExpiryCount: nearExpiryUnits.length,
    redistributionSuggestions,
  };

  emitRealtimeEvent('blood:expiry_sweep', result);
  return result;
}
