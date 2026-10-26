import { z } from 'zod';
import {
  EntityBaseFormSchema,
  EntityBaseSchema,
} from '@/contracts/entities/operationsagr/EntityBaseContract';

export const OagTechnicalVisitSchema = EntityBaseSchema.extend({
  TviID: z.number().int(),
  TvsID: z.number().int(),
  TviPerformedDate: z.string(),
  TviDocumentSeries: z.string().nullish(),
  TviDocumentNumber: z.number().int().nullish(),
  TviLatitude: z.number().min(-90).max(90).nullish(),
  TviLongitude: z.number().min(-180).max(180).nullish(),
  TviObservation: z.string().nullish(),
  TviSignatureFilID: z.number().int().nullish(),
  Snapshot: z.string(),
});

export const OagTechnicalVisitFormSchema = EntityBaseFormSchema.extend({
  TviID: z.number().int().optional().default(0),
  TvsID: z.number().int().optional().default(0),
  TviPerformedDate: z.string().optional().default(''),
  TviDocumentSeries: z.string().nullable().optional().default(null),
  TviDocumentNumber: z.number().int().nullable().optional().default(null),
  TviLatitude: z.number().min(-90).max(90).nullable().optional().default(null),
  TviLongitude: z
    .number()
    .min(-180)
    .max(180)
    .nullable()
    .optional()
    .default(null),
  TviObservation: z.string().nullable().optional().default(null),
  TviSignatureFilID: z.number().int().nullable().optional().default(null),
  Snapshot: z.string().optional().default('{}'),
});

export const createOagTechnicalVisitForm = () =>
  OagTechnicalVisitFormSchema.parse({});

export type OagTechnicalVisit = z.infer<typeof OagTechnicalVisitSchema>;
export type OagTechnicalVisitForm = z.infer<typeof OagTechnicalVisitFormSchema>;
