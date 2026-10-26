import { z } from 'zod';
import {
  EntityBaseFormSchema,
  EntityBaseSchema,
} from '@/contracts/entities/operationsagr/EntityBaseContract';

export const OagTechnicalVisitDiagnosisSchema = EntityBaseSchema.extend({
  TvdID: z.number().int(),
  TviID: z.number().int(),
  TvdCategory: z.number().int(),
  PlgID: z.number().int().nullish(),
  FrsID: z.number().int().nullish(),
  TvdPlantOrgan: z.number().int().nullish(),
  TvdIncidencePercentage: z.number().min(0).max(100).nullish(),
  TvdItemDescription: z.string().nullish(),
  TvdObservation: z.string().nullish(),
});

export const OagTechnicalVisitDiagnosisFormSchema = EntityBaseFormSchema.extend(
  {
    TvdID: z.number().int().optional().default(0),
    TviID: z.number().int().optional().default(0),
    TvdCategory: z.number().int().optional().default(0),
    PlgID: z.number().int().nullable().optional().default(null),
    FrsID: z.number().int().nullable().optional().default(null),
    TvdPlantOrgan: z.number().int().nullable().optional().default(null),
    TvdIncidencePercentage: z
      .number()
      .min(0)
      .max(100)
      .nullable()
      .optional()
      .default(null),
    TvdItemDescription: z.string().nullable().optional().default(null),
    TvdObservation: z.string().nullable().optional().default(null),
  },
);

export const createOagTechnicalVisitDiagnosisForm = () =>
  OagTechnicalVisitDiagnosisFormSchema.parse({});

export type OagTechnicalVisitDiagnosis = z.infer<
  typeof OagTechnicalVisitDiagnosisSchema
>;
export type OagTechnicalVisitDiagnosisForm = z.infer<
  typeof OagTechnicalVisitDiagnosisFormSchema
>;
