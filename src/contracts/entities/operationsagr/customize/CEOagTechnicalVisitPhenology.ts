import { z } from 'zod';
import { OagTechnicalVisitPhenologySchema } from '../entities/OagTechnicalVisitPhenology';

export const CEOagTechnicalVisitPhenologySchema =
  OagTechnicalVisitPhenologySchema.extend({
    TphStageDescription: z.string().nullish(),
  });

export type CEOagTechnicalVisitPhenology = z.infer<
  typeof CEOagTechnicalVisitPhenologySchema
>;
