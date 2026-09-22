import { prisma } from '../prisma.js';
import { haversineDistance, calculateETA, getCompatibleDonorGroups, isUnitViableForTransit } from '@lifelink/shared';
import { EquipmentStatus, BloodUnitStatus, OfferStatus, BloodGroup, BloodComponent } from '@prisma/client';
import { emitRealtimeEvent } from '../realtime/socket.js';

export interface CandidateProvider {
  facilityId: string;
  facilityName: string;
  distanceKm: number;
  etaMins: number;
  unitIds: string[];
}

export async function matchAndCreateOffers(requestId: string): Promise<CandidateProvider[]> {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: { requesterFacility: true },
  });

  if (!request) return [];

  const requester = request.requesterFacility;
  const radii = [25, 50, 100]; // Multi-step expansion

  let candidates: CandidateProvider[] = [];

  for (const radiusKm of radii) {
    if (request.kind === 'EQUIPMENT' && request.equipmentTypeId) {
      // Find candidate facilities
      const facilities = await prisma.facility.findMany({
        where: {
          active: true,
          id: { not: requester.id },
        },
        include: {
          equipmentUnits: {
            where: {
              typeId: request.equipmentTypeId,
              status: EquipmentStatus.AVAILABLE,
              shareable: true,
            },
          },
        },
      });

      const matchedInStep: CandidateProvider[] = [];

      for (const fac of facilities) {
        const dist = haversineDistance(requester.lat, requester.lng, fac.lat, fac.lng);
        if (dist > radiusKm) continue;

        // Reserve floor check
        const reserveFloors = (fac.reserveFloors as Record<string, number>) || {};
        const eqType = await prisma.equipmentType.findUnique({ where: { id: request.equipmentTypeId } });
        const floor = eqType ? reserveFloors[eqType.code] || 0 : 0;

        const availableUnits = fac.equipmentUnits;
        const shareableCount = Math.max(0, availableUnits.length - floor);

        if (shareableCount >= request.quantity) {
          matchedInStep.push({
            facilityId: fac.id,
            facilityName: fac.name,
            distanceKm: dist,
            etaMins: calculateETA(dist),
            unitIds: availableUnits.slice(0, request.quantity).map((u) => u.id),
          });
        }
      }

      if (matchedInStep.length > 0) {
        candidates = matchedInStep;
        break; // Stop expanding radius once candidates found
      }
    } else if (request.kind === 'BLOOD' && request.bloodGroup && request.bloodComponent) {
      // Compatible blood matching with FEFO
      const bgSymbol = request.bloodGroup.replace('_POS', '+').replace('_NEG', '-');
      const compatibleGroups = getCompatibleDonorGroups(bgSymbol as any, request.bloodComponent as any)
        .map((g) => g.replace('+', '_POS').replace('-', '_NEG') as BloodGroup);

      const facilities = await prisma.facility.findMany({
        where: {
          active: true,
          id: { not: requester.id },
        },
        include: {
          bloodUnits: {
            where: {
              bloodGroup: { in: compatibleGroups },
              component: request.bloodComponent,
              status: BloodUnitStatus.AVAILABLE,
            },
            orderBy: { expiresAt: 'asc' }, // FEFO
          },
        },
      });

      const matchedInStep: CandidateProvider[] = [];

      for (const fac of facilities) {
        const dist = haversineDistance(requester.lat, requester.lng, fac.lat, fac.lng);
        if (dist > radiusKm) continue;

        const etaMins = calculateETA(dist);
        // Ensure units have remaining life for transit + 6h safety margin
        const viableUnits = fac.bloodUnits.filter((u) => isUnitViableForTransit(u.expiresAt, etaMins, 6));

        // Reserve floor check
        const reserveFloors = (fac.reserveFloors as Record<string, number>) || {};
        const floor = reserveFloors[bgSymbol] || 0;
        const shareableCount = Math.max(0, viableUnits.length - floor);

        if (shareableCount >= request.quantity) {
          matchedInStep.push({
            facilityId: fac.id,
            facilityName: fac.name,
            distanceKm: dist,
            etaMins,
            unitIds: viableUnits.slice(0, request.quantity).map((u) => u.id),
          });
        }
      }

      if (matchedInStep.length > 0) {
        candidates = matchedInStep;
        break;
      }
    }
  }

  // Sort candidates by ETA (fastest arrival first)
  candidates.sort((a, b) => a.etaMins - b.etaMins);

  // Take top 3 providers
  const topCandidates = candidates.slice(0, 3);

  // Expiration duration: 10 minutes for criticality >= 4, 30 minutes otherwise
  const expiryMins = request.patientCriticality >= 4 ? 10 : 30;
  const expiresAt = new Date(Date.now() + expiryMins * 60 * 1000);

  for (const candidate of topCandidates) {
    const offer = await prisma.offer.create({
      data: {
        requestId: request.id,
        providerFacilityId: candidate.facilityId,
        unitIds: candidate.unitIds,
        distanceKm: candidate.distanceKm,
        etaMins: candidate.etaMins,
        status: OfferStatus.PROPOSED,
        expiresAt,
      },
    });

    // Notify provider facility via socket
    emitRealtimeEvent(
      'offer:received',
      {
        offerId: offer.id,
        requestId: request.id,
        request,
        distanceKm: candidate.distanceKm,
        etaMins: candidate.etaMins,
        expiresAt,
      },
      `facility:${candidate.facilityId}`
    );
  }

  return topCandidates;
}
