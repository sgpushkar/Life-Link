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
