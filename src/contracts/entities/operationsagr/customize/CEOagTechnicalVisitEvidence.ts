import { z } from 'zod';
import { OagTechnicalVisitEvidenceSchema } from '../entities/OagTechnicalVisitEvidence';

export const CEOagTechnicalVisitEvidenceSchema =
  OagTechnicalVisitEvidenceSchema.extend({
    // Agregar aquí las propiedades adicionales de OagTechnicalVisitEvidenceCe.
  });

export type CEOagTechnicalVisitEvidence = z.infer<
  typeof CEOagTechnicalVisitEvidenceSchema
>;
