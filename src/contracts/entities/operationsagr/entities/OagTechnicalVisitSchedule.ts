import { z } from 'zod';
import {
  EntityBaseFormSchema,
  EntityBaseSchema,
} from '@/contracts/entities/operationsagr/EntityBaseContract';

export const OagTechnicalVisitScheduleSchema = EntityBaseSchema.extend({
  TvsID: z.number().int(),
  PlfID: z.number().int(),
  CmpID: z.number().int().nullish(),
  TvsScheduledDate: z.string(),
  TvsResponsiblePrsID: z.number().int(),
  TvsVisitType: z.number().int(),
  TvsObservation: z.string().nullish(),
  PlfName: z.string().nullish(),
  FrfName: z.string().nullish(),
  CmpName: z.string().nullish(),
  ProducerName: z.string().nullish(),
  ResponsibleName: z.string().nullish(),
  VrtDescription: z.string().nullish(),
  CltDescription: z.string().nullish(),
  TypeCropDescription: z.string().nullish(),
  FrfAddress: z.string().nullish(),
  ZonDescription: z.string().nullish(),
  SzoDescription: z.string().nullish(),
  TviID: z.number().int().nullish(),
});

export const OagTechnicalVisitScheduleFormSchema = EntityBaseFormSchema.extend({
  TvsID: z.number().int().optional().default(0),
  PlfID: z.number().int().optional().default(0),
  CmpID: z.number().int().nullable().optional().default(null),
  TvsScheduledDate: z.string().optional().default(''),
  TvsResponsiblePrsID: z.number().int().optional().default(0),
  TvsVisitType: z.number().int().optional().default(0),
  TvsObservation: z.string().nullable().optional().default(null),
});

export const createOagTechnicalVisitScheduleForm = () =>
  OagTechnicalVisitScheduleFormSchema.parse({});

export type OagTechnicalVisitSchedule = z.infer<
  typeof OagTechnicalVisitScheduleSchema
>;
export type OagTechnicalVisitScheduleForm = z.infer<
  typeof OagTechnicalVisitScheduleFormSchema
>;
