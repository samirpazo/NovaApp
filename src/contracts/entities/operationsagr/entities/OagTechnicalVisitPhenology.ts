import { z } from 'zod';
import {
  EntityBaseFormSchema,
  EntityBaseSchema,
} from '@/contracts/entities/operationsagr/EntityBaseContract';

export const OagTechnicalVisitPhenologySchema = EntityBaseSchema.extend({
  TphID: z.number().int(),
  TviID: z.number().int(),
  TphStage: z.number().int(),
  TphPercentage: z.number().min(0).max(100),
});

export const OagTechnicalVisitPhenologyFormSchema = EntityBaseFormSchema.extend(
  {
    TphID: z.number().int().default(0),
    TviID: z.number().int().default(0),
    TphStage: z.number().int().default(0),
    TphPercentage: z.number().min(0).max(100).default(0),
  },
);

export const createOagTechnicalVisitPhenologyForm = () =>
  OagTechnicalVisitPhenologyFormSchema.parse({});

export type OagTechnicalVisitPhenology = z.infer<
  typeof OagTechnicalVisitPhenologySchema
>;
export type OagTechnicalVisitPhenologyForm = z.infer<
  typeof OagTechnicalVisitPhenologyFormSchema
>;
