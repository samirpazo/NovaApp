import { z } from 'zod';
import { OagTechnicalVisitDiagnosisSchema } from '../entities/OagTechnicalVisitDiagnosis';

export const CEOagTechnicalVisitDiagnosisSchema =
  OagTechnicalVisitDiagnosisSchema.extend({
    // Agregar aquí las propiedades adicionales de OagTechnicalVisitDiagnosisCe.
  });

export type CEOagTechnicalVisitDiagnosis = z.infer<
  typeof CEOagTechnicalVisitDiagnosisSchema
>;
