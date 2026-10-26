import { z } from 'zod';
import { CEOagTechnicalVisitSchema } from './CEOagTechnicalVisit';
import { CEOagTechnicalVisitActivitySchema } from './CEOagTechnicalVisitActivity';
import { CEOagTechnicalVisitApplicationSchema } from './CEOagTechnicalVisitApplication';
import { CEOagTechnicalVisitCulturalActivitySchema } from './CEOagTechnicalVisitCulturalActivity';
import { CEOagTechnicalVisitCulturalActivityFollowUpSchema } from './CEOagTechnicalVisitCulturalActivityFollowUp';
import { CEOagTechnicalVisitDiagnosisSchema } from './CEOagTechnicalVisitDiagnosis';
import { CEOagTechnicalVisitEvidenceSchema } from './CEOagTechnicalVisitEvidence';
import { CEOagTechnicalVisitInstallationSchema } from './CEOagTechnicalVisitInstallation';
import { CEOagTechnicalVisitPhenologySchema } from './CEOagTechnicalVisitPhenology';
import { CEOagTechnicalVisitRecommendationSchema } from './CEOagTechnicalVisitRecommendation';
import { CEOagTechnicalVisitRecommendationFollowUpSchema } from './CEOagTechnicalVisitRecommendationFollowUp';
import { CETadTechnicalVisitApplicationDetailSchema } from './CETadTechnicalVisitApplicationDetail';

export const CEOagTechnicalVisitLoadSchema = z.object({
  Visit: CEOagTechnicalVisitSchema,
  Applications: CEOagTechnicalVisitApplicationSchema.array(),
  ApplicationDetails: CETadTechnicalVisitApplicationDetailSchema.array(),
  Diagnoses: CEOagTechnicalVisitDiagnosisSchema.array(),
  Phenology: CEOagTechnicalVisitPhenologySchema.array(),
  Activities: CEOagTechnicalVisitActivitySchema.array(),
  Installations: CEOagTechnicalVisitInstallationSchema.array(),
  Recommendations: CEOagTechnicalVisitRecommendationSchema.array(),
  PreviousRecommendations: CEOagTechnicalVisitRecommendationSchema.array(),
  RecommendationFollowUps:
    CEOagTechnicalVisitRecommendationFollowUpSchema.array(),
  CulturalActivities: CEOagTechnicalVisitCulturalActivitySchema.array(),
  PreviousCulturalActivities: CEOagTechnicalVisitCulturalActivitySchema.array(),
  CulturalActivityFollowUps:
    CEOagTechnicalVisitCulturalActivityFollowUpSchema.array(),
  Evidences: CEOagTechnicalVisitEvidenceSchema.array(),
});

export type CEOagTechnicalVisitLoad = z.infer<
  typeof CEOagTechnicalVisitLoadSchema
>;
