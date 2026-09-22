import { z } from 'zod';
import { USER_ROLES } from '../constants.js';

export const loginSchema = z.object({
  phone: z
    .string()
    .min(10, 'Phone must be at least 10 digits')
    .max(15, 'Phone cannot exceed 15 digits')
    .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const otpRequestSchema = z.object({
  phone: z
    .string()
    .min(10)
    .max(15)
    .regex(/^\+?[0-9]{10,15}$/),
});

export type OtpRequestInput = z.infer<typeof otpRequestSchema>;

export const otpVerifySchema = z.object({
  phone: z.string().min(10).max(15),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;

export const personaLoginSchema = z.object({
  role: z.enum(USER_ROLES),
  facilityId: z.string().optional(),
});

export type PersonaLoginInput = z.infer<typeof personaLoginSchema>;
