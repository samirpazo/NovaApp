import { z } from 'zod';
import {
  EntityBaseFormSchema,
  EntityBaseSchema,
} from '@/contracts/entities/operationsagr/EntityBaseContract';

export const OagTechnicalVisitCulturalActivitySchema = EntityBaseSchema.extend({
  TcaID: z.number().int(),
  TviID: z.number().int(),
  TcaActivityType: z.number().int(),
  TcaIsCompleted: z.boolean(),
  TcaStartDate: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
  TcaEndDate: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
  TcaObservation: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
});

export const OagTechnicalVisitCulturalActivityFormSchema =
  EntityBaseFormSchema.extend({
    TcaID: z.number().int().default(0),
    TviID: z.number().int().default(0),
    TcaActivityType: z.number().int().default(0),
    TcaIsCompleted: z.boolean().default(false),
    TcaStartDate: z.string().nullable().default(null),
    TcaEndDate: z.string().nullable().default(null),
    TcaObservation: z.string().nullable().default(null),
  });

export const createOagTechnicalVisitCulturalActivityForm = () =>
  OagTechnicalVisitCulturalActivityFormSchema.parse({});

export type OagTechnicalVisitCulturalActivity = z.infer<
  typeof OagTechnicalVisitCulturalActivitySchema
>;
export type OagTechnicalVisitCulturalActivityForm = z.infer<
  typeof OagTechnicalVisitCulturalActivityFormSchema
>;
