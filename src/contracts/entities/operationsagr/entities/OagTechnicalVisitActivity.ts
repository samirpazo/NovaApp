import { z } from 'zod';
import {
  EntityBaseFormSchema,
  EntityBaseSchema,
} from '@/contracts/entities/operationsagr/EntityBaseContract';

export const OagTechnicalVisitActivitySchema = EntityBaseSchema.extend({
  TvaID: z.number().int(),
  TviID: z.number().int(),
  TvaActivityType: z.number().int(),
  TvaIrrigationType: z.number().int().nullish(),
  OwsID: z.number().int().nullish(),
  TvaIrrigationSystem: z.number().int().nullish(),
  TvaFuelType: z.number().int().nullish(),
  TvaPrunedTreeCount: z.number().int().nullish(),
  TvaWeedingType: z.number().int().nullish(),
  TvaTrapType: z.number().int().nullish(),
  TvaTrapCount: z.number().int().nullish(),
  TvaStartDate: z.string().nullish(),
  TvaEndDate: z.string().nullish(),
  TvaWaterVolume: z.number().nullish(),
  TvaWaterVolumeUnit: z.number().int().nullish(),
  TvaFlowRate: z.number().nullish(),
  TvaFlowRateUnit: z.number().int().nullish(),
  TvaDuration: z.number().nullish(),
  TvaDurationUnit: z.number().int().nullish(),
  TvaObservation: z.string().nullish(),
});

export const OagTechnicalVisitActivityFormSchema = EntityBaseFormSchema.extend({
  TvaID: z.number().int().optional().default(0),
  TviID: z.number().int().optional().default(0),
  TvaActivityType: z.number().int().optional().default(0),
  TvaIrrigationType: z.number().int().nullable().optional().default(null),
  OwsID: z.number().int().nullable().optional().default(null),
  TvaIrrigationSystem: z.number().int().nullable().optional().default(null),
  TvaFuelType: z.number().int().nullable().optional().default(null),
  TvaPrunedTreeCount: z.number().int().nullable().optional().default(null),
  TvaWeedingType: z.number().int().nullable().optional().default(null),
  TvaTrapType: z.number().int().nullable().optional().default(null),
  TvaTrapCount: z.number().int().nullable().optional().default(null),
  TvaStartDate: z.string().nullable().optional().default(null),
  TvaEndDate: z.string().nullable().optional().default(null),
  TvaWaterVolume: z.number().nullable().optional().default(null),
  TvaWaterVolumeUnit: z.number().int().nullable().optional().default(null),
  TvaFlowRate: z.number().nullable().optional().default(null),
  TvaFlowRateUnit: z.number().int().nullable().optional().default(null),
  TvaDuration: z.number().nullable().optional().default(null),
  TvaDurationUnit: z.number().int().nullable().optional().default(null),
  TvaObservation: z.string().nullable().optional().default(null),
});

export const createOagTechnicalVisitActivityForm = () =>
  OagTechnicalVisitActivityFormSchema.parse({});

export type OagTechnicalVisitActivity = z.infer<
  typeof OagTechnicalVisitActivitySchema
>;
export type OagTechnicalVisitActivityForm = z.infer<
  typeof OagTechnicalVisitActivityFormSchema
>;
