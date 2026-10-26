import { z } from 'zod';
import { OagTechnicalVisitRecommendationFollowUpSchema } from '../entities/OagTechnicalVisitRecommendationFollowUp';

export const CEOagTechnicalVisitRecommendationFollowUpSchema =
  OagTechnicalVisitRecommendationFollowUpSchema.extend({
    TrfStatusDescription: z.string().nullish(),
    TvrInstruction: z.string().nullish(),
    TvrFollowUpLabel: z.string().nullish(),
    TviPerformedDate: z.string().nullish(),
  });

export type CEOagTechnicalVisitRecommendationFollowUp = z.infer<
  typeof CEOagTechnicalVisitRecommendationFollowUpSchema
>;
