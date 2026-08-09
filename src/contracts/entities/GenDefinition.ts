import { EntityBaseContractSchema } from '@/contracts/entities/EntityBaseContract';
import { z } from 'zod';

export const GenDefinitionSchema = EntityBaseContractSchema.extend({
  DefID: z.number().int(),
  DefDescription: z.string(),
  DefCode: z.string(),
  DefStated: z.number().int(),
});

export type GenDefinition = z.infer<typeof GenDefinitionSchema>;
