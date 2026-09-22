import { z } from 'zod';
import {
  EQUIPMENT_STATUSES,
  BLOOD_GROUPS,
  BLOOD_COMPONENTS,
} from '../constants.js';

export const updateEquipmentUnitSchema = z.object({
  id: z.string(),
  status: z.enum(EQUIPMENT_STATUSES).optional(),
  shareable: z.boolean().optional(),
  notes: z.string().optional(),
});

export const bulkUpdateEquipmentSchema = z.object({
  facilityId: z.string(),
  updates: z.array(updateEquipmentUnitSchema),
});

export type BulkUpdateEquipmentInput = z.infer<typeof bulkUpdateEquipmentSchema>;

export const createBloodUnitSchema = z.object({
  facilityId: z.string(),
  bloodGroup: z.enum(BLOOD_GROUPS),
  component: z.enum(BLOOD_COMPONENTS),
  collectedAt: z.string().or(z.date()),
  expiresAt: z.string().or(z.date()),
});

export type CreateBloodUnitInput = z.infer<typeof createBloodUnitSchema>;

export const facilityShareSettingsSchema = z.object({
  reserveFloors: z.record(z.string(), z.number().int().min(0)), // resourceKey -> min count to retain
  quietHoursStart: z.string().optional(), // e.g. "22:00"
  quietHoursEnd: z.string().optional(), // e.g. "06:00"
});

export type FacilityShareSettingsInput = z.infer<typeof facilityShareSettingsSchema>;
