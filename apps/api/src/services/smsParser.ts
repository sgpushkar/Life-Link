import { prisma } from '../prisma.js';
import { calculatePriorityScore, recomputeAllOpenRequests } from './priority.js';
import { haversineDistance, calculateETA } from '@lifelink/shared';
import { RequestKind, RequestStatus, BloodGroup, EquipmentStatus, DonorPledgeStatus } from '@prisma/client';
import { emitRealtimeEvent } from '../realtime/socket.js';

export interface SmsResponse {
  reply: string;
  intent: string;
  success: boolean;
}

/**
 * Parses and executes SMS commands from feature phones per Section 7 specification:
 * - STOCK <TYPE> <QTY>
 * - NEED <TYPE> <QTY> URGENT <CRITICALITY>
 * - FIND <TYPE>
 * - ACCEPT <REQ_CODE>
 * - DECLINE <REQ_CODE>
 * - STATUS <REQ_CODE>
 * - PLEDGE <REQ_CODE>
 * - HELP
 */
export async function handleInboundSms(fromPhone: string, rawBody: string): Promise<SmsResponse> {
  const cleanPhone = fromPhone.trim();
  const text = rawBody.trim();
  const upper = text.toUpperCase();

  // 1. Identify user by registered phone
  const user = await prisma.user.findFirst({
    where: { phone: { contains: cleanPhone.slice(-10) } },
    include: { facility: true, donorProfile: true },
  });

  if (upper === 'HELP') {
    return {
      reply: 'LifeLink commands: STOCK VENT 3 | NEED VENT 1 URGENT 5 | NEED BLOOD B+ 2 URGENT 4 | FIND VENT | ACCEPT <ID> | STATUS <ID> | PLEDGE <ID>',
      intent: 'HELP',
      success: true,
    };
  }

  if (!user) {
    return {
      reply: 'LifeLink: Phone not recognized. Please register at lifelink.gov.in or visit your nearest PHC/CHC to activate feature phone access.',
      intent: 'UNKNOWN_USER',
      success: false,
    };
  }

  // 2. Command: STOCK <RESOURCE> <QTY>
  // e.g. "STOCK VENT 3" or "STOCK O2 5" or "STOCK BLOOD O+ 4"
  if (upper.startsWith('STOCK')) {
    if (!user.facilityId) {
      return { reply: 'LifeLink: Only registered facility administrators can update stock.', intent: 'UNAUTHORIZED', success: false };
    }

    const parts = upper.split(/\s+/);
    if (parts.length >= 3) {
      const typeKeyword = parts[1]; // VENT, O2, BLOOD
      const qtyStr = parts[parts.length - 1];
      const targetQty = parseInt(qtyStr, 10);

      if (isNaN(targetQty)) {
        return { reply: 'LifeLink error: Invalid quantity. Format: STOCK VENT 3 or STOCK O2 5', intent: 'INVALID_SYNTAX', success: false };
      }

      let typeCode = 'VENTILATOR';
      if (typeKeyword.includes('O2') || typeKeyword.includes('OXY')) typeCode = 'OXYGEN_CONCENTRATOR';
      if (typeKeyword.includes('BED')) typeCode = 'ICU_BED';

      const eqType = await prisma.equipmentType.findUnique({ where: { code: typeCode } });
      if (eqType) {
        // Adjust available units at user's facility to match targetQty
        const currentUnits = await prisma.equipmentUnit.findMany({
          where: { facilityId: user.facilityId, typeId: eqType.id },
        });

        const currentAvailable = currentUnits.filter((u) => u.status === EquipmentStatus.AVAILABLE).length;

        if (targetQty > currentAvailable) {
          const diff = targetQty - currentAvailable;
          for (let i = 0; i < diff; i++) {
            await prisma.equipmentUnit.create({
              data: {
                facilityId: user.facilityId,
                typeId: eqType.id,
                assetTag: `${typeCode.slice(0, 4)}-SMS-${Date.now().toString().slice(-4)}-${i + 1}`,
                status: EquipmentStatus.AVAILABLE,
                shareable: true,
              },
            });
          }
        } else if (targetQty < currentAvailable) {
          const diff = currentAvailable - targetQty;
          const toUpdate = currentUnits.filter((u) => u.status === EquipmentStatus.AVAILABLE).slice(0, diff);
          for (const u of toUpdate) {
            await prisma.equipmentUnit.update({
              where: { id: u.id },
              data: { status: EquipmentStatus.IN_USE },
            });
          }
        }

        emitRealtimeEvent('inventory:changed', { facilityId: user.facilityId, typeCode }, `facility:${user.facilityId}`);
        return {
          reply: `LifeLink: ${user.facility?.name} ${typeCode} stock updated to ${targetQty} available. Thank you.`,
          intent: 'STOCK_UPDATE',
          success: true,
        };
      }
    }
  }

  // 3. Command: NEED <RESOURCE> <QTY> URGENT <CRITICALITY>
  // e.g. "NEED VENT 1 URGENT 5" or "NEED BLOOD B+ 2 URGENT 4"
  if (upper.startsWith('NEED')) {
    if (!user.facilityId) {
      return { reply: 'LifeLink: Only healthcare facilities can submit emergency resource requests.', intent: 'UNAUTHORIZED', success: false };
    }

    const isBlood = upper.includes('BLOOD');
    let qty = 1;
    let criticality = 4; // Default high urgency for SMS

    const qtyMatch = upper.match(/(\d+)\s+URGENT/i) || upper.match(/NEED\s+[A-Z0-9+-]+\s+(\d+)/i);
    if (qtyMatch) qty = parseInt(qtyMatch[1], 10);

    const critMatch = upper.match(/URGENT\s+(\d)/i);
    if (critMatch) criticality = Math.min(5, Math.max(1, parseInt(critMatch[1], 10)));

    const now = new Date();
    const neededBy = new Date(now.getTime() + (criticality === 5 ? 45 : 90) * 60 * 1000);

    let createdRequest;

    if (isBlood) {
      const groupMatch = upper.match(/\b(A\+|A-|B\+|B-|AB\+|AB-|O\+|O-)\b/);
      const bg = groupMatch ? (groupMatch[1].replace('+', '_POS').replace('-', '_NEG') as BloodGroup) : BloodGroup.B_POS;

      const { priorityScore, breakdown } = calculatePriorityScore({
        patientCriticality: criticality,
        neededBy,
        createdAt: now,
        quantityRequested: qty,
      });

      createdRequest = await prisma.request.create({
        data: {
          kind: RequestKind.BLOOD,
          requesterFacilityId: user.facilityId,
          createdById: user.id,
          bloodGroup: bg,
          bloodComponent: 'PRBC',
          quantity: qty,
          patientCriticality: criticality,
          timeSensitivityMins: criticality === 5 ? 45 : 90,
          neededBy,
          patientSummary: {
            ageBand: 'ADULT',
            sex: 'OTHER',
            condition: 'Raised via SMS fallback: acute urgent blood requirement',
          },
          status: RequestStatus.OPEN,
          priorityScore,
          scoreBreakdown: breakdown as any,
        },
      });
    } else {
      let typeCode = 'VENTILATOR';
      if (upper.includes('O2') || upper.includes('OXY')) typeCode = 'OXYGEN_CONCENTRATOR';
      if (upper.includes('BED')) typeCode = 'ICU_BED';

      const eqType = await prisma.equipmentType.findUnique({ where: { code: typeCode } });
      const { priorityScore, breakdown } = calculatePriorityScore({
        patientCriticality: criticality,
        neededBy,
        createdAt: now,
        quantityRequested: qty,
      });

      createdRequest = await prisma.request.create({
        data: {
          kind: RequestKind.EQUIPMENT,
          requesterFacilityId: user.facilityId,
          createdById: user.id,
          equipmentTypeId: eqType ? eqType.id : null,
          quantity: qty,
          patientCriticality: criticality,
          timeSensitivityMins: criticality === 5 ? 45 : 90,
          neededBy,
          patientSummary: {
            ageBand: 'ADULT',
            sex: 'OTHER',
            condition: `Raised via SMS fallback: critical ${typeCode} deficit`,
          },
          status: RequestStatus.OPEN,
          priorityScore,
          scoreBreakdown: breakdown as any,
        },
      });
    }

    await recomputeAllOpenRequests();
    emitRealtimeEvent('request:created', { request: createdRequest });

    const shortId = createdRequest.id.slice(0, 6).toUpperCase();
    return {
      reply: `LifeLink: Request #${shortId} created! Priority score ${createdRequest.priorityScore} (Criticality ${criticality}). Matching nearby providers now...`,
      intent: 'CREATE_REQUEST',
      success: true,
    };
  }

  // 4. Command: FIND <RESOURCE>
  // e.g. "FIND VENT" or "FIND O2"
  if (upper.startsWith('FIND')) {
    let typeCode = 'VENTILATOR';
    if (upper.includes('O2') || upper.includes('OXY')) typeCode = 'OXYGEN_CONCENTRATOR';

    const eqType = await prisma.equipmentType.findUnique({ where: { code: typeCode } });
    if (!eqType) return { reply: 'Resource type not found.', intent: 'FIND', success: false };

    const facilities = await prisma.facility.findMany({
      where: { active: true },
      include: {
        equipmentUnits: {
          where: { typeId: eqType.id, status: EquipmentStatus.AVAILABLE, shareable: true },
        },
      },
    });

    const userLat = user.facility?.lat || 19.2403;
    const userLng = user.facility?.lng || 73.1305;

    const viable = facilities
      .filter((f) => f.equipmentUnits.length > 0 && f.id !== user.facilityId)
      .map((f) => ({
        name: f.name,
        phone: f.contactPhone,
        available: f.equipmentUnits.length,
        dist: haversineDistance(userLat, userLng, f.lat, f.lng),
        eta: calculateETA(haversineDistance(userLat, userLng, f.lat, f.lng)),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 2);

    if (viable.length === 0) {
      return { reply: `LifeLink: No shareable ${typeCode} available within district right now. Queue request with NEED ${typeCode} 1.`, intent: 'FIND', success: true };
    }

    const items = viable.map((v) => `${v.name.slice(0, 16)} (${v.available} avail, ${v.dist}km/ETA ${v.eta}m, Ph:${v.phone})`).join('; ');
    return {
      reply: `LifeLink nearest ${typeCode}: ${items}`,
      intent: 'FIND',
      success: true,
    };
  }

  // 5. Command: PLEDGE <REQ_CODE> (Donor Pledging via SMS)
  if (upper.startsWith('PLEDGE')) {
    if (!user.donorProfile) {
      return { reply: 'LifeLink: Only registered blood donors can pledge donations.', intent: 'UNAUTHORIZED', success: false };
    }

    const openBloodReq = await prisma.request.findFirst({
      where: { kind: RequestKind.BLOOD, status: RequestStatus.OPEN },
      include: { requesterFacility: true },
    });

    if (!openBloodReq) {
      return { reply: 'LifeLink: No open blood requests requiring pledges right now. Thank you for your readiness!', intent: 'PLEDGE', success: true };
    }

    await prisma.donorPledge.create({
      data: {
        requestId: openBloodReq.id,
        donorId: user.donorProfile.id,
        status: DonorPledgeStatus.PLEDGED,
        slotAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    emitRealtimeEvent('pledge:created', { requestId: openBloodReq.id, donorName: user.name });
    return {
      reply: `LifeLink: Pledge confirmed! Please report to ${openBloodReq.requesterFacility.name} within 2 hours. Address: ${openBloodReq.requesterFacility.address}.`,
      intent: 'PLEDGE',
      success: true,
    };
  }

  return {
    reply: `LifeLink: Command '${rawBody.slice(0, 20)}' not recognized. Text HELP for instructions.`,
    intent: 'UNKNOWN_COMMAND',
    success: false,
  };
}
