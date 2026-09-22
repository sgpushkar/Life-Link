import { z } from 'zod';

export const smsInboundSchema = z.object({
  fromPhone: z.string().min(10).max(15),
  body: z.string().min(1).max(250),
});

export type SmsInboundInput = z.infer<typeof smsInboundSchema>;

export const ussdSessionSchema = z.object({
  sessionId: z.string().min(1),
  phoneNumber: z.string().min(10).max(15),
  text: z.string().default(''),
});

export type UssdSessionInput = z.infer<typeof ussdSessionSchema>;
