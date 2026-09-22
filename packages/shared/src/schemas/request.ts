import { z } from 'zod';
import {
  REQUEST_KINDS,
  BLOOD_GROUPS,
  BLOOD_COMPONENTS,
} from '../constants.js';

/**
 * PRIVACY MANDATE:
 * In accordance with healthcare data minimization standards,
 * NEVER store patient names, phone numbers, Aadhaar/ABHA IDs, or direct identifiers on a Request.
 * Only age band, sex, and clinical condition summary are permitted.
 */
export const patientSummarySchema = z
  .object({
    ageBand: z.enum([
      'NEONATE',
      'INFANT',
      'CHILD',
      'ADOLESCENT',
      'ADULT',
      'ELDERLY',
    ]),
    sex: z.enum(['MALE', 'FEMALE', 'OTHER']),
    condition: z
      .string()
      .min(3, 'Condition description required')
      .max(250, 'Condition must be brief (max 250 chars)'),
  })
  .refine(
    (data) => {
      // Proactively reject if common PII keywords or 10-12 digit numbers are accidentally entered
      const serialized = JSON.stringify(data).toLowerCase();
      const hasPhone = /\b\d{10}\b/.test(serialized);
      const hasAadhaar = /\b\d{12}\b/.test(serialized);
      const hasNameKey = /name|phone|mobile|aadhaar|abha/i.test(serialized);
      return !hasPhone && !hasAadhaar;
    },
    {
      message:
        'Patient summary must not contain personal identifiable information (phone, Aadhaar, ABHA, or patient name)',
    }
  );

export type PatientSummary = z.infer<typeof patientSummarySchema>;

export const createRequestSchema = z
  .object({
    kind: z.enum(REQUEST_KINDS),
    requesterFacilityId: z.string().min(1, 'Requester facility required'),
    equipmentTypeId: z.string().optional(),
    bloodGroup: z.enum(BLOOD_GROUPS).optional(),
    bloodComponent: z.enum(BLOOD_COMPONENTS).optional(),
    quantity: z.number().int().min(1, 'Quantity must be at least 1').max(20),
    patientCriticality: z
      .number()
      .int()
      .min(1, 'Criticality must be between 1 and 5')
      .max(5, 'Criticality must be between 1 and 5'),
    timeSensitivityMins: z
      .number()
      .int()
      .min(5, 'Time sensitivity must be at least 5 minutes')
      .max(1440, 'Time sensitivity cannot exceed 24 hours (1440 mins)'),
    neededBy: z.string().or(z.date()),
    patientSummary: patientSummarySchema,
  })
  .refine(
    (data) => {
      if (data.kind === 'EQUIPMENT') {
        return !!data.equipmentTypeId;
      }
      if (data.kind === 'BLOOD') {
        return !!data.bloodGroup && !!data.bloodComponent;
      }
      return false;
    },
    {
      message:
        'Equipment requests require equipmentTypeId; Blood requests require bloodGroup and bloodComponent',
    }
  );

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
