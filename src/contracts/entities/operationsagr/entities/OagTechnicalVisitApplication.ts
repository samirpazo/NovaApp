import { z } from 'zod';
import {
  EntityBaseFormSchema,
  EntityBaseSchema,
} from '@/contracts/entities/operationsagr/EntityBaseContract';

export const OagTechnicalVisitApplicationSchema = EntityBaseSchema.extend({
  TapID: z.number().int(),
  TviID: z.number().int(),
  TapApplicationMode: z
    .number()
    .int()
    .nullish()
    .transform((value) => value ?? null),
  TapStartDateTime: z
    .string()
    .datetime({ offset: true })
    .nullish()
    .transform((value) => value ?? null),
  TapEndDateTime: z
    .string()
    .datetime({ offset: true })
    .nullish()
    .transform((value) => value ?? null),
  TapWaterLiters: z
    .number()
    .nullish()
    .transform((value) => value ?? null),
  TapFuelExpense: z
    .number()
    .nullish()
    .transform((value) => value ?? null),
  TapAppliedHectares: z
    .number()
    .nullish()
    .transform((value) => value ?? null),
  TapAppliedPlants: z
    .number()
    .nullish()
    .transform((value) => value ?? null),
  TapGeneralObservation: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
});

export const OagTechnicalVisitApplicationFormSchema =
  EntityBaseFormSchema.extend({
    TapID: z.number().int().default(0),
    TviID: z.number().int().default(0),
    TapApplicationMode: z.number().int().default(0),
    TapStartDateTime: z.string().default(''),
    TapEndDateTime: z.string().default(''),
    TapWaterLiters: z.number().nullable().default(null),
    TapFuelExpense: z.number().nullable().default(null),
    TapAppliedHectares: z.number().nullable().default(null),
    TapAppliedPlants: z.number().nullable().default(null),
    TapGeneralObservation: z.string().nullable().default(null),
  });

export const createOagTechnicalVisitApplicationForm = () =>
  OagTechnicalVisitApplicationFormSchema.parse({});

export type OagTechnicalVisitApplication = z.infer<
  typeof OagTechnicalVisitApplicationSchema
>;
export type OagTechnicalVisitApplicationForm = z.infer<
  typeof OagTechnicalVisitApplicationFormSchema
>;
