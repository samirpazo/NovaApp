import { z } from 'zod';
import { OagTechnicalVisitRecommendationSchema } from '../entities/OagTechnicalVisitRecommendation';

export const CEOagTechnicalVisitRecommendationSchema =
  OagTechnicalVisitRecommendationSchema.extend({
    PlfID: z.number().int().nullish(),
    TviPerformedDate: z.string().nullish(),
    TvrRecommendationTypeDescription: z.string().nullish(),
    FrsDescription: z.string().nullish(),
    TvrDoseUnitDescription: z.string().nullish(),
    TvrFollowUpLabel: z.string().nullish(),
  });

export type CEOagTechnicalVisitRecommendation = z.infer<
  typeof CEOagTechnicalVisitRecommendationSchema
>;
