import { EntityBaseContractSchema } from '@/contracts/entities/EntityBaseContract';
import { nullableIntegerSchema, nullableStringSchema } from '@/contracts/common';
import { z } from 'zod';

export const RstBranchSchema = EntityBaseContractSchema.extend({
  BrhID: z.number().int(),
  BrhResID: z.number().int(),
  BrhName: z.string(),
  BrhAddress: nullableStringSchema,
  BrhPhone: nullableStringSchema,
  BrhEmail: nullableStringSchema,
  BrhManagerName: nullableStringSchema,
  BrhCurrencyDefID: nullableIntegerSchema,
});

export type RstBranch = z.infer<typeof RstBranchSchema>;
