import { z } from 'zod';
import {
  EntityBaseFormSchema,
  EntityBaseSchema,
} from '@/contracts/entities/operationsagr/EntityBaseContract';

export const OagTechnicalVisitCulturalActivityFollowUpSchema =
  EntityBaseSchema.extend({
    TcfID: z.number().int(),
    TviID: z.number().int(),
    TcaID: z.number().int(),
    TcfStatus: z.number().int(),
    TcfObservation: z.string().nullish(),
  });

export const OagTechnicalVisitCulturalActivityFollowUpFormSchema =
  EntityBaseFormSchema.extend({
    TcfID: z.number().int().default(0),
    TviID: z.number().int().default(0),
    TcaID: z.number().int().default(0),
    TcfStatus: z.number().int().default(0),
    TcfObservation: z.string().nullable().default(null),
  });

export const createOagTechnicalVisitCulturalActivityFollowUpForm = () =>
  OagTechnicalVisitCulturalActivityFollowUpFormSchema.parse({});

export type OagTechnicalVisitCulturalActivityFollowUp = z.infer<
  typeof OagTechnicalVisitCulturalActivityFollowUpSchema
>;
export type OagTechnicalVisitCulturalActivityFollowUpForm = z.infer<
  typeof OagTechnicalVisitCulturalActivityFollowUpFormSchema
>;
