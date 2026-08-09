import { EntityBaseContractSchema } from '@/contracts/entities/EntityBaseContract';
import { z } from 'zod';

export const RstBranchSchema = EntityBaseContractSchema.extend({
  BrhID: z.number().int(),
  BrhResID: z.number().int(),
  BrhName: z.string(),
  BrhAddress: z.string().nullable(),
  BrhPhone: z.string().nullable(),
  BrhEmail: z.string().nullable(),
  BrhManagerName: z.string().nullable(),
  BrhCurrencyDefID: z.number().int().nullable(),
});

export type RstBranch = z.infer<typeof RstBranchSchema>;
