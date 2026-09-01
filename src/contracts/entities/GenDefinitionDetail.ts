import { EntityBaseContractSchema } from '@/contracts/entities/EntityBaseContract';
import {
  nullableIntegerSchema,
  nullableStringSchema,
} from '@/contracts/common';
import { z } from 'zod';

export const GenDefinitionDetailSchema = EntityBaseContractSchema.extend({
  DedID: z.number().int(),
  DedCode: nullableStringSchema,
  DedDescription: z.string(),
  DedValue: z.number().int(),
  DedAbbreviation: nullableStringSchema,
  DedFormat: nullableStringSchema,
  DedHelper: nullableStringSchema,
  DedHelper2: nullableStringSchema,
  DedIcon: nullableStringSchema,
  DedColor: nullableStringSchema,
  DedStated: z.number().int(),
  DefID: z.number().int(),
  DedGroup: nullableStringSchema,
  DedImageFilID: nullableIntegerSchema,
});

export type GenDefinitionDetail = z.infer<typeof GenDefinitionDetailSchema>;
