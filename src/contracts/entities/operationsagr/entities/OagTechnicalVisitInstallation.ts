import { z } from 'zod';
import {
  EntityBaseFormSchema,
  EntityBaseSchema,
} from '@/contracts/entities/operationsagr/EntityBaseContract';

export const OagTechnicalVisitInstallationSchema = EntityBaseSchema.extend({
  TinID: z.number().int(),
  TviID: z.number().int(),
  TinInstallationType: z.number().int(),
  TinIsAvailable: z.boolean(),
  TinObservation: z.string().nullish(),
});

export const OagTechnicalVisitInstallationFormSchema =
  EntityBaseFormSchema.extend({
    TinID: z.number().int().default(0),
    TviID: z.number().int().default(0),
    TinInstallationType: z.number().int().default(0),
    TinIsAvailable: z.boolean().default(false),
    TinObservation: z.string().nullable().default(null),
  });

export const createOagTechnicalVisitInstallationForm = () =>
  OagTechnicalVisitInstallationFormSchema.parse({});

export type OagTechnicalVisitInstallation = z.infer<
  typeof OagTechnicalVisitInstallationSchema
>;
export type OagTechnicalVisitInstallationForm = z.infer<
  typeof OagTechnicalVisitInstallationFormSchema
>;
