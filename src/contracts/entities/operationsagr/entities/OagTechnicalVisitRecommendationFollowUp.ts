import { z } from 'zod';
import {
  EntityBaseFormSchema,
  EntityBaseSchema,
} from '@/contracts/entities/operationsagr/EntityBaseContract';

export const OagTechnicalVisitRecommendationFollowUpSchema =
  EntityBaseSchema.extend({
    TrfID: z.number().int(),
    TviID: z.number().int(),
    TvrID: z.number().int(),
    TrfStatus: z.number().int(),
    TrfObservation: z.string().nullish(),
  });

export const OagTechnicalVisitRecommendationFollowUpFormSchema =
  EntityBaseFormSchema.extend({
    TrfID: z.number().int().default(0),
    TviID: z.number().int().default(0),
    TvrID: z.number().int().default(0),
    TrfStatus: z.number().int().default(0),
    TrfObservation: z.string().nullable().default(null),
  });

export const createOagTechnicalVisitRecommendationFollowUpForm = () =>
  OagTechnicalVisitRecommendationFollowUpFormSchema.parse({});

export type OagTechnicalVisitRecommendationFollowUp = z.infer<
  typeof OagTechnicalVisitRecommendationFollowUpSchema
>;
export type OagTechnicalVisitRecommendationFollowUpForm = z.infer<
  typeof OagTechnicalVisitRecommendationFollowUpFormSchema
>;
