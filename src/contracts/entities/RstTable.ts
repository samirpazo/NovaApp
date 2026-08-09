import { EntityBaseContractSchema } from '@/contracts/entities/EntityBaseContract';
import { z } from 'zod';

export const RstTableSchema = EntityBaseContractSchema.extend({
  TabID: z.number().int(),
  TabTableNumber: z.number().int(),
  TabCapacity: z.number().int(),
  TabStatus: z.number().int(),
  BrhID: z.number().int().nullable(),
  TabPosX: z.number().int(),
  TabPosY: z.number().int(),
  TabWidth: z.number().int(),
  TabHeight: z.number().int(),
  TabRotation: z.number().int(),
  TabShape: z.string(),
  TabZIndex: z.number().int(),
});

export type RstTable = z.infer<typeof RstTableSchema>;
