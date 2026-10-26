import { z } from 'zod';
import {
  EntityBaseFormSchema,
  EntityBaseSchema,
} from '@/contracts/entities/operationsagr/EntityBaseContract';

export const OagTechnicalVisitRecommendationSchema = EntityBaseSchema.extend({
  TvrID: z.number().int(),
  TviID: z.number().int(),
  TvrRecommendationType: z.number().int(),
  TvrObjective: z.string().nullish(),
  FstID: z.number().int().nullish(),
  FrsID: z.number().int().nullish(),
  TvrProductDescription: z.string().nullish(),
  TvrDose: z.number().nullish(),
  TvrDoseUnit: z.number().int().nullish(),
  TvrSortOrder: z.number().int(),
  TvrInstruction: z.string().nullish(),
});

export const OagTechnicalVisitRecommendationFormSchema =
  EntityBaseFormSchema.extend({
    TvrID: z.number().int().optional().default(0),
    TviID: z.number().int().optional().default(0),
    TvrRecommendationType: z.number().int().optional().default(0),
    TvrObjective: z.string().nullable().optional().default(null),
    FstID: z.number().int().nullable().optional().default(null),
    FrsID: z.number().int().nullable().optional().default(null),
    TvrProductDescription: z.string().nullable().optional().default(null),
    TvrDose: z.number().nullable().optional().default(null),
    TvrDoseUnit: z.number().int().nullable().optional().default(null),
    TvrSortOrder: z.number().int().optional().default(0),
    TvrInstruction: z.string().nullable().optional().default(null),
  });

export const createOagTechnicalVisitRecommendationForm = () =>
  OagTechnicalVisitRecommendationFormSchema.parse({});

export type OagTechnicalVisitRecommendation = z.infer<
  typeof OagTechnicalVisitRecommendationSchema
>;
export type OagTechnicalVisitRecommendationForm = z.infer<
  typeof OagTechnicalVisitRecommendationFormSchema
>;
