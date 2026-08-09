import { GuidSchema, nullableIntegerSchema, nullableStringSchema } from '@/contracts/common';
import { z } from 'zod';

export const EntityBaseContractSchema = z.object({
  SyncId: GuidSchema,
  SyncVersion: z.string(),
  SecStatus: z.boolean(),
  CreateUserId: z.number().int(),
  UpdateUserId: nullableIntegerSchema,
  DeleteUserId: nullableIntegerSchema,
  CreateDate: z.string(),
  UpdateDate: nullableStringSchema,
  DeleteDate: nullableStringSchema,
});

export type EntityBaseContract = z.infer<typeof EntityBaseContractSchema>;
