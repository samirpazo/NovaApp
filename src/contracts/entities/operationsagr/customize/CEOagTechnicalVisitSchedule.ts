import { z } from 'zod';
import { OagTechnicalVisitScheduleSchema } from '../entities/OagTechnicalVisitSchedule';

export const CEOagTechnicalVisitScheduleSchema =
  OagTechnicalVisitScheduleSchema.extend({
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

export type CEOagTechnicalVisitSchedule = z.infer<
  typeof CEOagTechnicalVisitScheduleSchema
>;
