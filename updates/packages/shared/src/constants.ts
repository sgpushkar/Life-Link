export const USER_ROLES = [
  'FACILITY_ADMIN',
  'BLOOD_BANK',
  'DONOR',
  'TRANSPORT',
  'DHO',
  'STATE_ADMIN',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const FACILITY_TYPES = [
  'DISTRICT_HOSPITAL',
  'CHC',
  'PHC',
  'BLOOD_BANK',
  'DONATION_CAMP',
] as const;

export type FacilityType = (typeof FACILITY_TYPES)[number];

export const EQUIPMENT_TYPE_CODES = [
  'VENTILATOR',
  'OXYGEN_CONCENTRATOR',
  'ICU_BED',
  'BIPAP',
  'DEFIBRILLATOR',
  'SYRINGE_PUMP',
  'SUCTION_MACHINE',
  'INFUSION_PUMP',
] as const;

export type EquipmentTypeCode = (typeof EQUIPMENT_TYPE_CODES)[number];

export const EQUIPMENT_STATUSES = [
  'AVAILABLE',
  'IN_USE',
  'RESERVED',
  'MAINTENANCE',
  'ON_LOAN',
] as const;

export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number];

export const BLOOD_GROUPS = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
] as const;

export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const BLOOD_COMPONENTS = [
  'WHOLE',
  'PRBC',
  'PLATELETS',
  'PLASMA',
] as const;

export type BloodComponent = (typeof BLOOD_COMPONENTS)[number];

export const BLOOD_UNIT_STATUSES = [
  'AVAILABLE',
  'RESERVED',
  'ISSUED',
  'EXPIRED',
  'DISCARDED',
] as const;

export type BloodUnitStatus = (typeof BLOOD_UNIT_STATUSES)[number];

export const REQUEST_KINDS = ['EQUIPMENT', 'BLOOD'] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

export const REQUEST_STATUSES = [
  'OPEN',
  'MATCHED',
  'IN_TRANSIT',
  'FULFILLED',
  'CANCELLED',
  'EXPIRED',
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const OFFER_STATUSES = [
  'PROPOSED',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
] as const;

export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const LOGISTICS_STATUSES = [
  'PENDING',
  'ASSIGNED',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'RETURNED',
  'FAILED',
] as const;

export type LogisticsStatus = (typeof LOGISTICS_STATUSES)[number];

export const LOGISTICS_TYPES = ['PICKUP', 'RETURN'] as const;
export type LogisticsType = (typeof LOGISTICS_TYPES)[number];

export const DONOR_PLEDGE_STATUSES = [
  'PLEDGED',
  'CONFIRMED',
  'DONATED',
  'NO_SHOW',
  'CANCELLED',
] as const;

export type DonorPledgeStatus = (typeof DONOR_PLEDGE_STATUSES)[number];

export interface PriorityWeights {
  criticality: number;
  time: number;
  distance: number;
  scarcity: number;
  ageBonus: number;
}

export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  criticality: 0.45,
  time: 0.25,
  distance: 0.10,
  scarcity: 0.10,
  ageBonus: 0.10,
};

export const DEFAULT_ROAD_SPEED_KMPH = 40;
export const BLOOD_MIN_TRANSIT_BUFFER_HOURS = 6;
export const DONOR_WHOLE_BLOOD_INTERVAL_DAYS = 90;

// --- COLD-CHAIN & BIOLOGICAL TELEMETRY ---
export interface ColdChainSpec {
  minTemp: number;
  maxTemp: number;
  criticalMax: number;
  label: string;
}

export const COLD_CHAIN_SPECIFICATIONS: Record<BloodComponent, ColdChainSpec> = {
  PRBC: { minTemp: 2.0, maxTemp: 6.0, criticalMax: 10.0, label: 'Packed Red Blood Cells (PRBC)' },
  WHOLE: { minTemp: 2.0, maxTemp: 6.0, criticalMax: 10.0, label: 'Whole Blood' },
  PLATELETS: { minTemp: 20.0, maxTemp: 24.0, criticalMax: 26.0, label: 'Platelets' },
  PLASMA: { minTemp: -35.0, maxTemp: -18.0, criticalMax: -10.0, label: 'Fresh Frozen Plasma (FFP)' },
};

export interface ColdChainTelemetry {
  jobId: string;
  cargoType: string;
  currentTemp: number;
  targetMin: number;
  targetMax: number;
  ambientTemp: number;
  batteryPercent: number;
  sensorHealth: 'NOMINAL' | 'WARNING' | 'CRITICAL';
  excursionDetected: boolean;
  rateOfRisePerMin: number;
  projectedSpoilageMinutes: number | null;
  rerouteStatus: {
    active: boolean;
    originalFacility: string;
    reroutedFacility: string;
    reason: string;
    diversionTimeMinutes: number;
    unitsPreserved: number;
  } | null;
  updatedAt: string;
}

// --- COOPERATIVE GAME THEORY & MUTUAL AID ---
export interface MutualAidFacilityMetrics {
  facilityId: string;
  facilityName: string;
  facilityType: string;
  ercBalance: number; // Emergency Reserve Credits
  lendingRatio: number; // % of peer borrowing requests fulfilled
  idleSurplusCount: number; // Unallocated machines held during regional deficit
  hoardingRiskIndex: number; // 0 (Ideal) to 100 (Severe Hoarding)
  hoardingStatus: 'COLLABORATIVE' | 'BALANCED' | 'AT_RISK_HOARDING' | 'CRITICAL_HOARDER';
  priorityMultiplier: number; // 0.7x to 2.2x queue ranking boost
  slaInsuranceTier: 'TIER_1_PRIORITY_BACKSTOP' | 'STANDARD_QUEUE';
}

export interface MutualAidSummary {
  districtParetoEfficiency: number;
  activeErcCredits: number;
  reclaimedIdleUnits: number;
  totalLendingTransactions: number;
  facilities: MutualAidFacilityMetrics[];
}

// --- ONE-CLICK GLOBAL CRISIS SIMULATOR (WHO EMT DEFCON) ---
export type DisasterScenarioId = 'BASELINE' | 'CYCLONE_FLOOD' | 'EARTHQUAKE_74' | 'EPIDEMIC_REFUGEE';

export interface DisasterScenarioConfig {
  id: DisasterScenarioId;
  title: string;
  subtitle: string;
  defconLevel: number;
  description: string;
  powerGridOperationalPercent: number;
  droneCorridorsActive: boolean;
  activeHazardsCount: number;
  surgeCasualtyCount: number;
  blockedRoutes: { from: string; to: string; reason: string }[];
  compromisedFacilityIds: string[];
}

export const DISASTER_SCENARIOS: Record<DisasterScenarioId, DisasterScenarioConfig> = {
  BASELINE: {
    id: 'BASELINE',
    title: 'Baseline Peacetime Grid',
    subtitle: 'Standard Operations • Normal Traffic',
    defconLevel: 5,
    description: 'All arterial roads passable, standard clinical queuing, grid power 100% nominal.',
    powerGridOperationalPercent: 100,
    droneCorridorsActive: false,
    activeHazardsCount: 0,
    surgeCasualtyCount: 0,
    blockedRoutes: [],
    compromisedFacilityIds: [],
  },
  CYCLONE_FLOOD: {
    id: 'CYCLONE_FLOOD',
    title: 'Cyclone & Flash Flood Warning',
    subtitle: 'WHO EMT DEFCON 2 • Coastal Monsoon Surge',
    defconLevel: 2,
    description: 'Severe coastal flooding has submerged 2 arterial highway bridges. Road transit between Nerul and Kharghar is cut off. Autonomous Drone Corridors activated for emergency blood deliveries.',
    powerGridOperationalPercent: 55,
    droneCorridorsActive: true,
    activeHazardsCount: 3,
    surgeCasualtyCount: 28,
    blockedRoutes: [
      { from: 'NMMC Urban Health Centre (Nerul)', to: 'CIDCO CHC Kharghar', reason: 'Sion-Panvel Expressway Bridge Submerged' },
      { from: 'Dr. D.Y. Patil Hospital (Nerul)', to: 'Apollo Hospital (Belapur)', reason: 'Creek Overtopping' },
    ],
    compromisedFacilityIds: ['2'], // Nerul UHC flooded ground floor
  },
  EARTHQUAKE_74: {
    id: 'EARTHQUAKE_74',
    title: '7.4M Severe Earthquake Strike',
    subtitle: 'WHO EMT DEFCON 1 • Mass Casualty Protocol',
    defconLevel: 1,
    description: 'Major seismic strike has caused structural failure at 1 municipal hospital. 45 acute thoracic/crush triage cases queued. Priority algorithm forces life-threat ranking.',
    powerGridOperationalPercent: 30,
    droneCorridorsActive: true,
    activeHazardsCount: 6,
    surgeCasualtyCount: 64,
    blockedRoutes: [
      { from: 'LTMG Sion Hospital (Mumbai)', to: 'KEM Hospital (Parel, Mumbai)', reason: 'Overpass Structural Collapse' },
    ],
    compromisedFacilityIds: ['2', '3'],
  },
  EPIDEMIC_REFUGEE: {
    id: 'EPIDEMIC_REFUGEE',
    title: 'Epidemic Cluster & Mass Inflow',
    subtitle: 'WHO EMT DEFCON 3 • Rapid Fluid & Oxygen Depletion',
    defconLevel: 3,
    description: 'Acute respiratory and gastrointestinal outbreak in informal settlements. Massive surge in 10L oxygen concentrators and FFP plasma requests.',
    powerGridOperationalPercent: 85,
    droneCorridorsActive: false,
    activeHazardsCount: 2,
    surgeCasualtyCount: 42,
    blockedRoutes: [],
    compromisedFacilityIds: [],
  },
};

