import { z } from 'zod';
import { OagTechnicalVisitCulturalActivityFollowUpSchema } from '../entities/OagTechnicalVisitCulturalActivityFollowUp';

export const CEOagTechnicalVisitCulturalActivityFollowUpSchema =
  OagTechnicalVisitCulturalActivityFollowUpSchema.extend({
    TcaActivityTypeDescription: z.string().nullish(),
    TcaObservation: z.string().nullish(),
    TcaStartDate: z.string().nullish(),
    TcaEndDate: z.string().nullish(),
    TcfStatusDescription: z.string().nullish(),
    TviPerformedDate: z.string().nullish(),
  });

export type CEOagTechnicalVisitCulturalActivityFollowUp = z.infer<
  typeof CEOagTechnicalVisitCulturalActivityFollowUpSchema
>;
