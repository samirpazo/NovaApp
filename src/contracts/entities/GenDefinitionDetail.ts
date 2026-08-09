import { EntityBaseContractSchema } from '@/contracts/entities/EntityBaseContract';
import { z } from 'zod';

export const GenDefinitionDetailSchema = EntityBaseContractSchema.extend({
  DedID: z.number().int(),
  DedCode: z.string().nullable(),
  DedDescription: z.string(),
  DedValue: z.number().int(),
  DedAbbreviation: z.string().nullable(),
  DedFormat: z.string().nullable(),
  DedHelper: z.string().nullable(),
  DedHelper2: z.string().nullable(),
  DedIcon: z.string().nullable(),
  DedColor: z.string().nullable(),
  DedStated: z.number().int(),
  DefID: z.number().int(),
  DedGroup: z.string().nullable(),
  DedImagePath: z.string().nullable(),
});

export type GenDefinitionDetail = z.infer<typeof GenDefinitionDetailSchema>;
