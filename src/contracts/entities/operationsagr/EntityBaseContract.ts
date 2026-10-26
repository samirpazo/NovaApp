import { EntityBaseContractSchema } from '@/contracts/entities/EntityBaseContract';
import { z } from 'zod';

export const EntityBaseSchema = EntityBaseContractSchema;

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
