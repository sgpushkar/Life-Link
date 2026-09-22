import { PrismaClient, UserRole, FacilityType, EquipmentStatus, BloodGroup, BloodComponent, BloodUnitStatus, RequestKind, RequestStatus, OfferStatus, LogisticsStatus, LogisticsType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting LifeLink Database Seeding for Navi Mumbai & Mumbai Mesh...');

  // 1. Clean existing records in reverse dependency order
  await prisma.syncOp.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.smsInbox.deleteMany({});
  await prisma.smsOutbox.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.forecastAlert.deleteMany({});
  await prisma.demandEvent.deleteMany({});
  await prisma.inventorySnapshot.deleteMany({});
  await prisma.donorPledge.deleteMany({});
  await prisma.donorProfile.deleteMany({});
  await prisma.logisticsJob.deleteMany({});
  await prisma.allocation.deleteMany({});
  await prisma.offer.deleteMany({});
  await prisma.request.deleteMany({});
  await prisma.bloodUnit.deleteMany({});
  await prisma.equipmentUnit.deleteMany({});
  await prisma.equipmentType.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.facility.deleteMany({});
  await prisma.district.deleteMany({});

  const passwordHash = await bcrypt.hash('demo1234', 10);

  // 2. Create District / Region
  const district = await prisma.district.create({
    data: {
      name: 'Navi Mumbai & Mumbai Municipal Health Mesh',
      state: 'Maharashtra',
      centroidLat: 19.0330,
      centroidLng: 73.0297,
    },
  });
  console.log(`✓ Seeded District: ${district.name}`);

  // 3. Create Facilities
  const facilitiesData = [
    {
      name: 'NMMC Urban Health Centre (Nerul)',
      type: FacilityType.PHC,
      lat: 19.0330,
      lng: 73.0180,
      address: 'Sector 15, Nerul East, Navi Mumbai, MH 400706',
      contactPhone: '9820011001',
      reserveFloors: { OXYGEN_CONCENTRATOR: 1 },
    },
    {
      name: 'Dr. D.Y. Patil Medical Hospital (Nerul)',
      type: FacilityType.DISTRICT_HOSPITAL,
      lat: 19.0430,
      lng: 73.0250,
      address: 'Sector 5, Nerul, Navi Mumbai, MH 400706',
      contactPhone: '9820011002',
      reserveFloors: { VENTILATOR: 1, OXYGEN_CONCENTRATOR: 1, ICU_BED: 2 },
    },
    {
      name: 'Navi Mumbai Municipal Blood Centre (Vashi)',
      type: FacilityType.BLOOD_BANK,
      lat: 19.0770,
      lng: 72.9980,
      address: 'Sector 10, Vashi, Navi Mumbai, MH 400703',
      contactPhone: '9820011003',
      reserveFloors: { 'O-': 2, 'B+': 2 },
    },
    {
      name: 'NMMC General Hospital (Vashi)',
      type: FacilityType.CHC,
      lat: 19.0740,
      lng: 72.9990,
      address: 'Sector 10, Vashi, Navi Mumbai, MH 400703',
      contactPhone: '022-27899999',
      reserveFloors: { VENTILATOR: 1, OXYGEN_CONCENTRATOR: 2 },
    },
    {
      name: 'CIDCO Community Health Centre (Kharghar)',
      type: FacilityType.CHC,
      lat: 19.0470,
      lng: 73.0690,
      address: 'Sector 12, Kharghar, Navi Mumbai, MH 410210',
      contactPhone: '9820011008',
      reserveFloors: { VENTILATOR: 1, OXYGEN_CONCENTRATOR: 1 },
    },
    {
      name: 'KEM Hospital & Medical College (Parel, Mumbai)',
      type: FacilityType.DISTRICT_HOSPITAL,
      lat: 19.0020,
      lng: 72.8420,
      address: 'Acharya Donde Marg, Parel, Mumbai, MH 400012',
      contactPhone: '022-24107000',
      reserveFloors: { VENTILATOR: 3, OXYGEN_CONCENTRATOR: 4 },
    },
    {
      name: 'LTMG Sion Hospital (Mumbai)',
      type: FacilityType.DISTRICT_HOSPITAL,
      lat: 19.0370,
      lng: 72.8600,
      address: 'Sion West, Mumbai, MH 400022',
      contactPhone: '022-24076381',
      reserveFloors: { VENTILATOR: 2, OXYGEN_CONCENTRATOR: 2 },
    },
    {
      name: 'Jeevan Jyoti Blood Centre (Nerul)',
      type: FacilityType.BLOOD_BANK,
      lat: 19.0300,
      lng: 73.0200,
      address: 'Sector 20, Nerul, Navi Mumbai, MH 400706',
      contactPhone: '9820011009',
      reserveFloors: { 'O-': 1 },
    },
    {
      name: 'NMMC General Hospital (Airoli)',
      type: FacilityType.CHC,
      lat: 19.1550,
      lng: 72.9980,
      address: 'Sector 3, Airoli, Navi Mumbai, MH 400708',
      contactPhone: '022-27791234',
      reserveFloors: { OXYGEN_CONCENTRATOR: 1 },
    },
    {
      name: 'Navi Mumbai Mobile Blood Donation Unit',
      type: FacilityType.DONATION_CAMP,
      lat: 19.0400,
      lng: 73.0220,
      address: 'Central Park Mobile Bay, Kharghar, MH 410210',
      contactPhone: '9820011019',
      reserveFloors: {},
    },
  ];

  const facilities: Record<string, any> = {};
  for (const fac of facilitiesData) {
    const created = await prisma.facility.create({
      data: {
        name: fac.name,
        type: fac.type,
        districtId: district.id,
        lat: fac.lat,
        lng: fac.lng,
        address: fac.address,
        contactPhone: fac.contactPhone,
        reserveFloors: fac.reserveFloors,
      },
    });
    facilities[fac.name] = created;
  }
  console.log(`✓ Seeded ${Object.keys(facilities).length} Facilities`);

  // 4. Create Equipment Types
  const equipmentTypesData = [
    { code: 'VENTILATOR', name: 'ICU Invasive Ventilator', unit: 'device' },
    { code: 'OXYGEN_CONCENTRATOR', name: '10L High-Flow Oxygen Concentrator', unit: 'unit' },
    { code: 'ICU_BED', name: 'Motorized Multi-Function ICU Bed', unit: 'bed' },
    { code: 'BIPAP', name: 'Non-Invasive BiPAP Machine', unit: 'device' },
    { code: 'DEFIBRILLATOR', name: 'Biphasic Defibrillator with Monitor', unit: 'device' },
    { code: 'SYRINGE_PUMP', name: 'Precision Infusion Syringe Pump', unit: 'pump' },
  ];

  const eqTypes: Record<string, any> = {};
  for (const eq of equipmentTypesData) {
    const created = await prisma.equipmentType.create({
      data: eq,
    });
    eqTypes[eq.code] = created;
  }
  console.log(`✓ Seeded ${Object.keys(eqTypes).length} Equipment Types`);

  // 5. Create Equipment Units with surplus/deficit states
  // Dr. D.Y. Patil has surplus: 2 ventilators (available), 4 O2 concentrators (available), 8 ICU beds
  for (let i = 1; i <= 2; i++) {
    await prisma.equipmentUnit.create({
      data: {
        facilityId: facilities['Dr. D.Y. Patil Medical Hospital (Nerul)'].id,
        typeId: eqTypes['VENTILATOR'].id,
        assetTag: `DYP-VENT-0${i}`,
        status: EquipmentStatus.AVAILABLE,
        shareable: true,
        notes: 'Ready for regional peer loan',
      },
    });
  }

  for (let i = 1; i <= 4; i++) {
    await prisma.equipmentUnit.create({
      data: {
        facilityId: facilities['Dr. D.Y. Patil Medical Hospital (Nerul)'].id,
        typeId: eqTypes['OXYGEN_CONCENTRATOR'].id,
        assetTag: `DYP-O2-0${i}`,
        status: EquipmentStatus.AVAILABLE,
        shareable: true,
      },
    });
  }

  for (let i = 1; i <= 10; i++) {
    await prisma.equipmentUnit.create({
      data: {
        facilityId: facilities['Dr. D.Y. Patil Medical Hospital (Nerul)'].id,
        typeId: eqTypes['ICU_BED'].id,
        assetTag: `DYP-BED-0${i}`,
        status: i <= 8 ? EquipmentStatus.AVAILABLE : EquipmentStatus.IN_USE,
        shareable: false,
      },
    });
  }

  // NMMC Nerul UHC has shortage: 0 available O2 concentrators, 0 available ventilators
  await prisma.equipmentUnit.create({
    data: {
      facilityId: facilities['NMMC Urban Health Centre (Nerul)'].id,
      typeId: eqTypes['VENTILATOR'].id,
      assetTag: 'NRL-VENT-01',
      status: EquipmentStatus.IN_USE,
      shareable: false,
    },
  });

  for (let i = 1; i <= 2; i++) {
    await prisma.equipmentUnit.create({
      data: {
        facilityId: facilities['NMMC Urban Health Centre (Nerul)'].id,
        typeId: eqTypes['OXYGEN_CONCENTRATOR'].id,
        assetTag: `NRL-O2-0${i}`,
        status: EquipmentStatus.IN_USE,
        shareable: false,
      },
    });
  }

  // KEM Hospital (Parel) has 6 ventilators, 10 O2 units
  for (let i = 1; i <= 6; i++) {
    await prisma.equipmentUnit.create({
      data: {
        facilityId: facilities['KEM Hospital & Medical College (Parel, Mumbai)'].id,
        typeId: eqTypes['VENTILATOR'].id,
        assetTag: `KEM-VENT-0${i}`,
        status: i <= 4 ? EquipmentStatus.AVAILABLE : EquipmentStatus.IN_USE,
        shareable: true,
      },
    });
  }
  console.log('✓ Seeded Equipment Units across Navi Mumbai & Mumbai');

  // 6. Create Blood Units with near-expiry FEFO batch
  const now = new Date();
  const expiring48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const expiring68h = new Date(now.getTime() + 68 * 60 * 60 * 1000);
  const fresh30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // 4 units of O- PRBC expiring in 48 hours at Navi Mumbai Blood Centre
  for (let i = 1; i <= 4; i++) {
    await prisma.bloodUnit.create({
      data: {
        facilityId: facilities['Navi Mumbai Municipal Blood Centre (Vashi)'].id,
        bloodGroup: BloodGroup.O_NEG,
        component: BloodComponent.PRBC,
        collectedAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
        expiresAt: expiring48h,
        status: BloodUnitStatus.AVAILABLE,
      },
    });
  }

  // 6 units of B+ PRBC expiring in 68 hours at Navi Mumbai Blood Centre
  for (let i = 1; i <= 6; i++) {
    await prisma.bloodUnit.create({
      data: {
        facilityId: facilities['Navi Mumbai Municipal Blood Centre (Vashi)'].id,
        bloodGroup: BloodGroup.B_POS,
        component: BloodComponent.PRBC,
        collectedAt: new Date(now.getTime() - 39 * 24 * 60 * 60 * 1000),
        expiresAt: expiring68h,
        status: BloodUnitStatus.AVAILABLE,
      },
    });
  }

  // Standard inventory across all 8 blood groups
  const groups = [
    BloodGroup.A_POS, BloodGroup.A_NEG, BloodGroup.B_POS, BloodGroup.B_NEG,
    BloodGroup.AB_POS, BloodGroup.AB_NEG, BloodGroup.O_POS, BloodGroup.O_NEG,
  ];

  for (const bg of groups) {
    await prisma.bloodUnit.create({
      data: {
        facilityId: facilities['Navi Mumbai Municipal Blood Centre (Vashi)'].id,
        bloodGroup: bg,
        component: BloodComponent.WHOLE,
        collectedAt: now,
        expiresAt: fresh30d,
        status: BloodUnitStatus.AVAILABLE,
      },
    });
    await prisma.bloodUnit.create({
      data: {
        facilityId: facilities['Jeevan Jyoti Blood Centre (Nerul)'].id,
        bloodGroup: bg,
        component: BloodComponent.PRBC,
        collectedAt: now,
        expiresAt: fresh30d,
        status: BloodUnitStatus.AVAILABLE,
      },
    });
  }
  console.log('✓ Seeded Blood Matrix Units & <72h FEFO Expiry Sweeps');

  // 7. Seed Demo Users for every role (STRICTLY Role Titles - NO Personal Names!)
  const usersToSeed = [
    {
      name: 'Facility Admin (NMMC Nerul UHC)',
      phone: '9820011001',
      role: UserRole.FACILITY_ADMIN,
      facilityId: facilities['NMMC Urban Health Centre (Nerul)'].id,
      abhaId: '14123456789001',
    },
    {
      name: 'Facility Admin (Dr. D.Y. Patil Hospital)',
      phone: '9820011002',
      role: UserRole.FACILITY_ADMIN,
      facilityId: facilities['Dr. D.Y. Patil Medical Hospital (Nerul)'].id,
      abhaId: '14123456789002',
    },
    {
      name: 'Blood Bank Officer (Navi Mumbai Municipal Blood Centre)',
      phone: '9820011003',
      role: UserRole.BLOOD_BANK,
      facilityId: facilities['Navi Mumbai Municipal Blood Centre (Vashi)'].id,
      abhaId: '14123456789003',
    },
    {
      name: 'Citizen Blood Donor (B+)',
      phone: '9820011004',
      role: UserRole.DONOR,
      facilityId: null,
      abhaId: '14123456789004',
    },
    {
      name: 'Emergency Transport Driver (Fleet Unit MH-43)',
      phone: '9820011005',
      role: UserRole.TRANSPORT,
      facilityId: null,
    },
    {
      name: 'Municipal Health Officer (MHO / DHO)',
      phone: '9820011006',
      role: UserRole.DHO,
      facilityId: null,
    },
    {
      name: 'State Health Administrator',
      phone: '9820011007',
      role: UserRole.STATE_ADMIN,
      facilityId: null,
    },
    {
      name: 'Facility Admin (CIDCO Kharghar CHC)',
      phone: '9820011008',
      role: UserRole.FACILITY_ADMIN,
      facilityId: facilities['CIDCO Community Health Centre (Kharghar)'].id,
    },
    {
      name: 'Blood Bank Officer (Jeevan Jyoti Blood Centre)',
      phone: '9820011009',
      role: UserRole.BLOOD_BANK,
      facilityId: facilities['Jeevan Jyoti Blood Centre (Nerul)'].id,
    },
  ];

  const seededUsers: Record<string, any> = {};
  for (const u of usersToSeed) {
    const created = await prisma.user.create({
      data: {
        name: u.name,
        phone: u.phone,
        passwordHash,
        role: u.role,
        facilityId: u.facilityId,
        abhaId: u.abhaId,
      },
    });
    seededUsers[u.phone] = created;
  }
  console.log(`✓ Seeded ${Object.keys(seededUsers).length} Core Stakeholder Role Users`);

  // 8. Seed Donor Profile for primary donor
  await prisma.donorProfile.create({
    data: {
      userId: seededUsers['9820011004'].id,
      bloodGroup: BloodGroup.B_POS,
      lastDonatedAt: new Date(now.getTime() - 110 * 24 * 60 * 60 * 1000), // 110 days ago (eligible)
      lat: 19.0340,
      lng: 73.0190,
      radiusKm: 25,
      available: true,
      totalDonations: 6,
    },
  });

  // 9. Seed Sample Requests (Triage Scoring)
  const req1NeededBy = new Date(now.getTime() + 40 * 60 * 1000);
  await prisma.request.create({
    data: {
      kind: RequestKind.EQUIPMENT,
      requesterFacilityId: facilities['NMMC Urban Health Centre (Nerul)'].id,
      createdById: seededUsers['9820011001'].id,
      equipmentTypeId: eqTypes['OXYGEN_CONCENTRATOR'].id,
      quantity: 1,
      patientCriticality: 5,
      timeSensitivityMins: 40,
      neededBy: req1NeededBy,
      patientSummary: {
        ageBand: 'ADULT',
        sex: 'MALE',
        condition: 'Severe hypoxemia & acute distress (SpO2 78%)',
      },
      status: RequestStatus.OPEN,
      priorityScore: 91.4,
      scoreBreakdown: {
        criticalityScore: 45.0,
        timeScore: 23.5,
        distanceScore: 7.4,
        scarcityScore: 8.5,
        ageBonus: 7.0,
        finalScore: 91.4,
      },
    },
  });

  const req2NeededBy = new Date(now.getTime() + 90 * 60 * 1000);
  await prisma.request.create({
    data: {
      kind: RequestKind.EQUIPMENT,
      requesterFacilityId: facilities['CIDCO Community Health Centre (Kharghar)'].id,
      createdById: seededUsers['9820011008'].id,
      equipmentTypeId: eqTypes['VENTILATOR'].id,
      quantity: 1,
      patientCriticality: 4,
      timeSensitivityMins: 90,
      neededBy: req2NeededBy,
      patientSummary: {
        ageBand: 'ELDERLY',
        sex: 'FEMALE',
        condition: 'Post-op respiratory insufficiency requiring mechanical support',
      },
      status: RequestStatus.OPEN,
      priorityScore: 78.6,
      scoreBreakdown: {
        criticalityScore: 36.0,
        timeScore: 19.2,
        distanceScore: 6.8,
        scarcityScore: 9.0,
        ageBonus: 7.6,
        finalScore: 78.6,
      },
    },
  });

  // Fulfilled Request demonstrating logistics & audit
  const fulfilledReq = await prisma.request.create({
    data: {
      kind: RequestKind.EQUIPMENT,
      requesterFacilityId: facilities['NMMC Urban Health Centre (Nerul)'].id,
      createdById: seededUsers['9820011001'].id,
      equipmentTypeId: eqTypes['OXYGEN_CONCENTRATOR'].id,
      quantity: 1,
      patientCriticality: 4,
      timeSensitivityMins: 60,
      neededBy: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      patientSummary: {
        ageBand: 'ADULT',
        sex: 'FEMALE',
        condition: 'Severe asthma crisis stabilized via loan',
      },
      status: RequestStatus.FULFILLED,
      priorityScore: 82.0,
      scoreBreakdown: { finalScore: 82.0 },
    },
  });

  const offer = await prisma.offer.create({
    data: {
      requestId: fulfilledReq.id,
      providerFacilityId: facilities['Dr. D.Y. Patil Medical Hospital (Nerul)'].id,
      unitIds: ['DYP-O2-01'],
      distanceKm: 3.5,
      etaMins: 12,
      status: OfferStatus.ACCEPTED,
    },
  });

  const allocation = await prisma.allocation.create({
    data: {
      requestId: fulfilledReq.id,
      offerId: offer.id,
      status: 'COMPLETED',
      acceptedAt: new Date(now.getTime() - 90 * 60 * 1000),
    },
  });

  await prisma.logisticsJob.create({
    data: {
      allocationId: allocation.id,
      type: LogisticsType.PICKUP,
      transportId: seededUsers['9820011005'].id,
      status: LogisticsStatus.DELIVERED,
      checklist: {
        'Power cable & adapter included': true,
        'Patient breathing circuits included': true,
        'Bacterial/viral filters attached': true,
        'Battery charged > 80%': true,
        'Calibration self-test passed': true,
      },
      handoverSignatures: {
        senderSign: 'Facility Admin (Dr. D.Y. Patil Hospital)',
        receiverSign: 'Facility Admin (NMMC Nerul UHC)',
        verified: true,
      },
      timeline: [
        { status: 'ASSIGNED', time: new Date(now.getTime() - 85 * 60 * 1000).toISOString() },
        { status: 'PICKED_UP', time: new Date(now.getTime() - 65 * 60 * 1000).toISOString() },
        { status: 'IN_TRANSIT', time: new Date(now.getTime() - 60 * 60 * 1000).toISOString() },
        { status: 'DELIVERED', time: new Date(now.getTime() - 35 * 60 * 1000).toISOString() },
      ],
    },
  });

  console.log('✅ LifeLink Database Seeded Successfully for Navi Mumbai & Mumbai Mesh!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
