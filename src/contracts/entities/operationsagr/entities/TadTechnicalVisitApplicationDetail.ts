import { z } from 'zod';
import { EntityBaseFormSchema, EntityBaseSchema } from '@/contracts/entities/operationsagr/EntityBaseContract';

export const TadTechnicalVisitApplicationDetailSchema = EntityBaseSchema.extend({
    TadID: z.number().int(),
    TapID: z.number().int(),
    TadFrsID: z.number().int().nullish().transform((value) => value ?? null),
    TadFstID: z.number().int().nullish().transform((value) => value ?? null),
    TadIsObservation: z.boolean(),
    TadProductDescription: z.string(),
    TadApplicationType: z.number().int(),
    TadDose: z.number().nullish().transform((value) => value ?? null),
    TadDoseUnit: z.number().int().nullish().transform((value) => value ?? null),
    TadQuantity: z.number().nullish().transform((value) => value ?? null),
    TadQuantityUnit: z.number().int().nullish().transform((value) => value ?? null),
    TadObservation: z.string().nullish().transform((value) => value ?? null),
});

export const TadTechnicalVisitApplicationDetailFormSchema = EntityBaseFormSchema.extend({
    TadID: z.number().int().default(0),
    TapID: z.number().int().default(0),
    TadFrsID: z.number().int().nullable().default(null),
    TadFstID: z.number().int().nullable().default(null),
    TadIsObservation: z.boolean().default(false),
    TadProductDescription: z.string().default(''),
    TadApplicationType: z.number().int().default(0),
    TadDose: z.number().nullable().default(null),
    TadDoseUnit: z.number().int().nullable().default(null),
    TadQuantity: z.number().nullable().default(null),
    TadQuantityUnit: z.number().int().nullable().default(null),
    TadObservation: z.string().nullable().default(null),
});

export const createTadTechnicalVisitApplicationDetailForm = () => TadTechnicalVisitApplicationDetailFormSchema.parse({});

export type TadTechnicalVisitApplicationDetail = z.infer<typeof TadTechnicalVisitApplicationDetailSchema>;
export type TadTechnicalVisitApplicationDetailForm = z.infer<typeof TadTechnicalVisitApplicationDetailFormSchema>;
