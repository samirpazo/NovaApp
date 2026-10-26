import { GuidSchema } from '@/contracts/common';
import { z } from 'zod';

export const EntityBaseSchema = z.object({
  SyncId: GuidSchema,
  SyncVersion: z.string(),
  SecStatus: z.boolean(),
  CreateUserId: z.number().int(),
  UpdateUserId: z.number().int().nullable(),
  DeleteUserId: z.number().int().nullable(),
  CreateDate: z.string(),
  UpdateDate: z.string().nullable(),
  DeleteDate: z.string().nullable(),
});

export const EntityBaseFormSchema = EntityBaseSchema.partial({
  SyncId: true,
  SyncVersion: true,
  CreateUserId: true,
  UpdateUserId: true,
  DeleteUserId: true,
  CreateDate: true,
  UpdateDate: true,
  DeleteDate: true,
}).extend({ SecStatus: z.boolean().default(true) });
