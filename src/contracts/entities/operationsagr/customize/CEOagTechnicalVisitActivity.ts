import { z } from 'zod';
import { OagTechnicalVisitActivitySchema } from '../entities/OagTechnicalVisitActivity';

export const CEOagTechnicalVisitActivitySchema =
  OagTechnicalVisitActivitySchema.extend({
    TvaActivityTypeDescription: z.string().nullish(),
    OwsName: z.string().nullish(),
  });

export type CEOagTechnicalVisitActivity = z.infer<
  typeof CEOagTechnicalVisitActivitySchema
>;
