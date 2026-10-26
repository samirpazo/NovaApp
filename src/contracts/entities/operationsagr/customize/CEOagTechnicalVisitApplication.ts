import { z } from 'zod';
import { OagTechnicalVisitApplicationSchema } from '../entities/OagTechnicalVisitApplication';

export const CEOagTechnicalVisitApplicationSchema =
  OagTechnicalVisitApplicationSchema.extend({
    TapApplicationModeDescription: z.string().nullish(),
  });

export type CEOagTechnicalVisitApplication = z.infer<
  typeof CEOagTechnicalVisitApplicationSchema
>;
