import { z } from 'zod';
import { OagTechnicalVisitInstallationSchema } from '../entities/OagTechnicalVisitInstallation';

export const CEOagTechnicalVisitInstallationSchema =
  OagTechnicalVisitInstallationSchema.extend({
    TinInstallationTypeDescription: z.string().nullish(),
  });

export type CEOagTechnicalVisitInstallation = z.infer<
  typeof CEOagTechnicalVisitInstallationSchema
>;
