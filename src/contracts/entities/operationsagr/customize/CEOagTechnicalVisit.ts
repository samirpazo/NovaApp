import { z } from 'zod';
import { OagTechnicalVisitSchema } from '../entities/OagTechnicalVisit';

export const CEOagTechnicalVisitSchema = OagTechnicalVisitSchema.extend({
  // Agregar aquí las propiedades adicionales de OagTechnicalVisitCe.
});

export type CEOagTechnicalVisit = z.infer<typeof CEOagTechnicalVisitSchema>;
