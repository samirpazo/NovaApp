import { z } from 'zod';
import { TadTechnicalVisitApplicationDetailSchema } from '../entities/TadTechnicalVisitApplicationDetail';

export const CETadTechnicalVisitApplicationDetailSchema = TadTechnicalVisitApplicationDetailSchema.extend({
    // Agregar aquí las propiedades adicionales de TadTechnicalVisitApplicationDetailCe.
});

export type CETadTechnicalVisitApplicationDetail = z.infer<typeof CETadTechnicalVisitApplicationDetailSchema>;
