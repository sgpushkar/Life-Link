import { z } from 'zod';

export const syncOpSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  userId: z.string(),
  opType: z.enum([
    'INVENTORY_EQUIPMENT_UPDATE',
    'INVENTORY_BLOOD_ADD',
    'CREATE_REQUEST',
    'PLEDGE_DONATION',
  ]),
  payload: z.record(z.string(), z.any()),
  clientTimestamp: z.number().int(),
});

export type SyncOp = z.infer<typeof syncOpSchema>;

export const batchSyncSchema = z.object({
  ops: z.array(syncOpSchema),
});

export type BatchSyncInput = z.infer<typeof batchSyncSchema>;
