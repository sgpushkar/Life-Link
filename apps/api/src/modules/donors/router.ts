import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma.js';
import { verifyAuth } from '../../middleware/auth.js';
import { haversineDistance, calculateETA, getCompatibleRecipientGroups } from '@lifelink/shared';
import { getSmsProvider } from '../../providers/sms.js';
import { emitRealtimeEvent } from '../../realtime/socket.js';
import { RequestKind, RequestStatus, DonorPledgeStatus, BloodGroup } from '@prisma/client';

export const donorsRouter = Router();

// 1. Get current donor profile & eligibility
donorsRouter.get('/me', verifyAuth, async (req: Request, res: Response) => {
  const profile = await prisma.donorProfile.findUnique({
    where: { userId: req.user!.userId },
    include: {
      user: true,
      pledges: {
        include: { request: { include: { requesterFacility: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!profile) {
    return res.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Donor profile not configured' } });
  }

  // 90-day eligibility check for whole blood donation
  const now = Date.now();
  let isEligible = true;
  let daysUntilEligible = 0;
  let nextEligibleDate: Date | null = null;

  if (profile.lastDonatedAt) {
    const lastMs = new Date(profile.lastDonatedAt).getTime();
    const intervalMs = 90 * 24 * 60 * 60 * 1000;
    const eligibleTime = lastMs + intervalMs;

    if (now < eligibleTime) {
      isEligible = false;
      daysUntilEligible = Math.ceil((eligibleTime - now) / (24 * 60 * 60 * 1000));
      nextEligibleDate = new Date(eligibleTime);
    }
  }

  // Calculate badge level based on total donations
  let badge = 'BRONZE_DONOR';
  if (profile.totalDonations >= 10) badge = 'CHAMPION_DONOR';
  else if (profile.totalDonations >= 5) badge = 'GOLD_DONOR';
  else if (profile.totalDonations >= 2) badge = 'SILVER_DONOR';

  return res.json({
    profile: {
      id: profile.id,
      name: profile.user.name,
      phone: profile.user.phone,
      bloodGroup: profile.bloodGroup,
      lastDonatedAt: profile.lastDonatedAt,
      radiusKm: profile.radiusKm,
      available: profile.available,
      totalDonations: profile.totalDonations,
      badge,
      isEligible,
      daysUntilEligible,
      nextEligibleDate,
      lat: profile.lat,
      lng: profile.lng,
    },
    pledges: profile.pledges,
  });
});

// 2. Update donor profile settings (availability, radius, location)
donorsRouter.patch('/me', verifyAuth, async (req: Request, res: Response) => {
  const { available, radiusKm, lat, lng, bloodGroup } = req.body;

  const updated = await prisma.donorProfile.update({
    where: { userId: req.user!.userId },
    data: {
      available: available !== undefined ? Boolean(available) : undefined,
      radiusKm: radiusKm !== undefined ? parseFloat(radiusKm) : undefined,
      lat: lat !== undefined ? parseFloat(lat) : undefined,
      lng: lng !== undefined ? parseFloat(lng) : undefined,
      bloodGroup: bloodGroup ? (bloodGroup as BloodGroup) : undefined,
    },
  });

  return res.json({ profile: updated });
});

// 3. Nearby Active Blood Requests Feed (strictly anonymous patient data!)
donorsRouter.get('/nearby-requests', verifyAuth, async (req: Request, res: Response) => {
  const profile = await prisma.donorProfile.findUnique({
    where: { userId: req.user!.userId },
  });

  const donorLat = profile?.lat || 19.2380;
  const donorLng = profile?.lng || 73.1320;
  const donorRadius = profile?.radiusKm || 30;
  const donorGroup = profile ? profile.bloodGroup.replace('_POS', '+').replace('_NEG', '-') : 'B+';

  // Find all recipient groups that this donor can donate to
  const compatibleRecipientGroups = getCompatibleRecipientGroups(donorGroup as any, 'PRBC')
    .map((g) => g.replace('+', '_POS').replace('-', '_NEG') as BloodGroup);

  const openBloodRequests = await prisma.request.findMany({
    where: {
      kind: RequestKind.BLOOD,
      status: RequestStatus.OPEN,
      bloodGroup: { in: compatibleRecipientGroups },
    },
    include: {
      requesterFacility: true,
      donorPledges: true,
    },
    orderBy: { priorityScore: 'desc' },
  });

  const feed = [];
  const now = Date.now();

  for (const r of openBloodRequests) {
    const fac = r.requesterFacility;
    const distanceKm = haversineDistance(donorLat, donorLng, fac.lat, fac.lng);

    if (distanceKm <= donorRadius) {
      const minutesLeft = Math.max(0, Math.round((new Date(r.neededBy).getTime() - now) / (60 * 1000)));

      feed.push({
        requestId: r.id,
        facilityName: fac.name,
        facilityAddress: fac.address,
        facilityPhone: fac.contactPhone,
        facilityLat: fac.lat,
        facilityLng: fac.lng,
        distanceKm,
        etaMins: calculateETA(distanceKm),
        bloodGroup: r.bloodGroup?.replace('_POS', '+').replace('_NEG', '-'),
        component: r.bloodComponent,
        quantityNeeded: r.quantity,
        pledgesCount: r.donorPledges.length,
        criticality: r.patientCriticality,
        minutesLeft,
        neededBy: r.neededBy,
        priorityScore: r.priorityScore,
        // STRICT PRIVACY: Zero patient clinical details or IDs exposed to donor!
      });
    }
  }

  feed.sort((a, b) => b.criticality - a.criticality || a.distanceKm - b.distanceKm);

  return res.json({ count: feed.length, requests: feed });
});

// 4. Donor Pledge Submission
donorsRouter.post('/requests/:id/pledge', verifyAuth, async (req: Request, res: Response) => {
  const requestId = req.params.id as string;
  const { slotAt } = req.body;

  const profile = await prisma.donorProfile.findUnique({
    where: { userId: req.user!.userId },
    include: { user: true },
  });

  if (!profile) {
    return res.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Donor profile required' } });
  }

  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: { requesterFacility: true },
  });

  if (!request || request.status !== RequestStatus.OPEN) {
    return res.status(400).json({ error: { code: 'REQUEST_NOT_OPEN', message: 'Request is no longer accepting pledges' } });
  }

  const pledge = await prisma.donorPledge.create({
    data: {
      requestId,
      donorId: profile.id,
      status: DonorPledgeStatus.PLEDGED,
      slotAt: slotAt ? new Date(slotAt) : new Date(Date.now() + 60 * 60 * 1000), // Default in 1 hour
    },
  });

  // Trigger simulated confirmation SMS
  const smsProvider = getSmsProvider();
  const smsBody = `LifeLink: Thank you ${profile.user.name.split(' ')[0]}! Your pledge to donate blood for ${request.requesterFacility.name} is confirmed for ${new Date(pledge.slotAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Address: ${request.requesterFacility.address}.`;
  await smsProvider.sendSms(profile.user.phone, smsBody);

  emitRealtimeEvent('pledge:created', {
    requestId,
    pledgeId: pledge.id,
    donorFirstName: profile.user.name.split(' ')[0],
    bloodGroup: profile.bloodGroup,
  }, `facility:${request.requesterFacilityId}`);

  return res.status(201).json({
    success: true,
    pledge,
    facility: request.requesterFacility,
    confirmationSms: smsBody,
  });
});
