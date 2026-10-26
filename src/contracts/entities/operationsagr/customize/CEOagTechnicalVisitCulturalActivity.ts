import { z } from 'zod';
import { OagTechnicalVisitCulturalActivitySchema } from '../entities/OagTechnicalVisitCulturalActivity';

export const CEOagTechnicalVisitCulturalActivitySchema =
  OagTechnicalVisitCulturalActivitySchema.extend({
    TcaActivityTypeDescription: z.string().nullish(),
    PlfID: z.number().int().nullish(),
    TviPerformedDate: z.string().nullish(),
  });

export type CEOagTechnicalVisitCulturalActivity = z.infer<
  typeof CEOagTechnicalVisitCulturalActivitySchema
>;
