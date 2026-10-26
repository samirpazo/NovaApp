import { z } from 'zod';
import {
  EntityBaseFormSchema,
  EntityBaseSchema,
} from '@/contracts/entities/operationsagr/EntityBaseContract';

export const OagTechnicalVisitEvidenceSchema = EntityBaseSchema.extend({
  TveID: z.number().int(),
  TviID: z.number().int(),
  TveFilID: z.number().int(),
  TveDescription: z.string().nullish(),
});

export const OagTechnicalVisitEvidenceFormSchema = EntityBaseFormSchema.extend({
  TveID: z.number().int().optional().default(0),
  TviID: z.number().int().optional().default(0),
  TveFilID: z.number().int().optional().default(0),
  TveDescription: z.string().nullable().optional().default(null),
});

export const createOagTechnicalVisitEvidenceForm = () =>
  OagTechnicalVisitEvidenceFormSchema.parse({});

export type OagTechnicalVisitEvidence = z.infer<
  typeof OagTechnicalVisitEvidenceSchema
>;
export type OagTechnicalVisitEvidenceForm = z.infer<
  typeof OagTechnicalVisitEvidenceFormSchema
>;
