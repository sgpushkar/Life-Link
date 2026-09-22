import { z } from 'zod';
import { LOGISTICS_STATUSES } from '../constants.js';

export const updateLogisticsStatusSchema = z.object({
  status: z.enum(LOGISTICS_STATUSES),
  notes: z.string().optional(),
  checklist: z.record(z.string(), z.boolean()).optional(),
  signatureName: z.string().optional(),
  signaturePin: z.string().optional(),
});

export type UpdateLogisticsStatusInput = z.infer<typeof updateLogisticsStatusSchema>;

export const defaultHandoverChecklist = [
  'Power cable & adapter included',
  'Patient breathing circuits included',
  'Bacterial/viral filters attached',
  'Battery charged > 80%',
  'Calibration self-test passed',
  'Physical inspection: no cracks or fluid damage',
];
