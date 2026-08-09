import { z } from 'zod';

export const EntityBaseContractSchema = z.object({
  SyncId: z.string().uuid(),
  SyncVersion: z.string(),
  SecStatus: z.boolean(),
  CreateUserId: z.number().int(),
  UpdateUserId: z.number().int().nullable(),
  DeleteUserId: z.number().int().nullable(),
  CreateDate: z.string(),
  UpdateDate: z.string().nullable(),
  DeleteDate: z.string().nullable(),
});

export type EntityBaseContract = z.infer<typeof EntityBaseContractSchema>;
