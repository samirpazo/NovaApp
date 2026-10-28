import { DateTime } from 'luxon';
import { z } from 'zod';

export type TechnicalVisitSnapshotRow = Record<string, unknown>;

const PendingFileSchema = z
  .object({
    uri: z.string(),
    name: z.string(),
    mimeType: z.string().nullish(),
  })
  .passthrough();

const SnapshotRowSchema = z.record(z.string(), z.unknown());

export const TechnicalVisitSnapshotSchema = z.object({
  Visit: SnapshotRowSchema,
  Applications: SnapshotRowSchema.array(),
  ApplicationDetails: SnapshotRowSchema.array(),
  Diagnoses: SnapshotRowSchema.array(),
  Phenology: SnapshotRowSchema.array(),
  Activities: SnapshotRowSchema.array(),
  Installations: SnapshotRowSchema.array(),
  Recommendations: SnapshotRowSchema.array(),
  PreviousRecommendations: SnapshotRowSchema.array(),
  RecommendationFollowUps: SnapshotRowSchema.array(),
  CulturalActivities: SnapshotRowSchema.array(),
  PreviousCulturalActivities: SnapshotRowSchema.array(),
  CulturalActivityFollowUps: SnapshotRowSchema.array(),
  Evidences: SnapshotRowSchema.array(),
  PendingSignatureFile: PendingFileSchema.nullish(),
});

export type TechnicalVisitSnapshot = z.infer<
  typeof TechnicalVisitSnapshotSchema
>;

export type TechnicalVisitSectionKey = Exclude<
  keyof TechnicalVisitSnapshot,
  'Visit' | 'PendingSignatureFile'
>;

const activeRows = (rows: TechnicalVisitSnapshotRow[]) =>
  rows.filter((row) => row.SecStatus !== false);

const numberValue = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const positiveValue = (value: unknown): number | null => {
  const parsed = numberValue(value);
  return parsed != null && parsed > 0 ? parsed : null;
};

const hasValue = (value: unknown) => value != null && value !== '';

const textValue = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const dateValue = (value: unknown): DateTime | null => {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = DateTime.fromISO(value, { setZone: true });
  return parsed.isValid ? parsed : null;
};

export function parseTechnicalVisitSnapshot(raw: string) {
  return TechnicalVisitSnapshotSchema.parse(JSON.parse(raw));
}

export function previousTechnicalVisitRows(
  rows: TechnicalVisitSnapshotRow[],
  currentVisitId: number,
  currentVisitDate: string,
) {
  const currentDate = dateValue(currentVisitDate);
  if (!currentDate) return [];
  return activeRows(rows).filter((row) => {
    if (numberValue(row.TviID) === currentVisitId) return false;
    const sourceDate = dateValue(row.TviPerformedDate);
    return sourceDate != null && sourceDate.toMillis() < currentDate.toMillis();
  });
}

function validateApplication(row: TechnicalVisitSnapshotRow) {
  const start = dateValue(row.TapStartDateTime);
  const end = dateValue(row.TapEndDateTime);
  if (positiveValue(row.TapApplicationMode) == null)
    return 'Selecciona la modalidad de aplicación.';
  if (!start || !end)
    return 'Completa la fecha y hora de inicio y fin de la aplicación.';
  if (end.toMillis() < start.toMillis())
    return 'La fecha y hora de fin deben ser posteriores al inicio.';
  if (
    [
      'TapWaterLiters',
      'TapFuelExpense',
      'TapAppliedHectares',
      'TapAppliedPlants',
    ].some((key) => {
      const value = numberValue(row[key]);
      return value != null && value < 0;
    })
  )
    return 'Los valores de la aplicación no pueden ser negativos.';
  return null;
}

function validateApplicationDetail(
  row: TechnicalVisitSnapshotRow,
  applications: TechnicalVisitSnapshotRow[],
) {
  const application = activeRows(applications).find(
    (item) => numberValue(item.TapID) === numberValue(row.TapID),
  );
  if (!application)
    return 'El producto debe pertenecer a una aplicación activa de la visita.';
  if (positiveValue(row.TadApplicationType) == null)
    return 'Selecciona el tipo de aplicación del producto.';
  if (positiveValue(row.TadDose) == null)
    return 'Indica una dosis mayor que cero.';
  if (positiveValue(row.TadDoseUnit) == null)
    return 'Selecciona la unidad de dosis.';
  if (positiveValue(row.TadQuantity) == null)
    return 'Indica una cantidad mayor que cero.';
  if (positiveValue(row.TadQuantityUnit) == null)
    return 'Selecciona la unidad de cantidad.';
  if (!textValue(row.TadProductDescription))
    return 'Describe el producto o la observación.';
  const isObservation = row.TadIsObservation === true;
  const supplyId = positiveValue(row.TadFrsID);
  if (isObservation && supplyId)
    return 'Una observación no debe tener un insumo relacionado.';
  if (!isObservation && !supplyId)
    return 'Selecciona el insumo relacionado con el producto.';
  return null;
}

function validateDiagnosis(row: TechnicalVisitSnapshotRow) {
  if (positiveValue(row.TvdCategory) == null)
    return 'Selecciona la categoría del diagnóstico.';
  const incidence = numberValue(row.TvdIncidencePercentage);
  if (incidence != null && (incidence < 0 || incidence > 100))
    return 'La incidencia del diagnóstico debe estar entre 0 y 100 %.';
  return null;
}

function validatePhenology(row: TechnicalVisitSnapshotRow) {
  if (positiveValue(row.TphStage) == null)
    return 'Selecciona la etapa fenológica.';
  const percentage = numberValue(row.TphPercentage);
  if (percentage == null || percentage < 0 || percentage > 100)
    return 'El porcentaje de fenología debe estar entre 0 y 100 %.';
  return null;
}

function validateActivity(row: TechnicalVisitSnapshotRow) {
  const type = positiveValue(row.TvaActivityType);
  const start = dateValue(row.TvaStartDate);
  const end = dateValue(row.TvaEndDate);
  if (type == null) return 'Selecciona el tipo de labor.';
  if (!start || !end) return 'Completa las fechas de inicio y fin de la labor.';
  if (end.toMillis() < start.toMillis())
    return 'La fecha de fin de la labor debe ser posterior al inicio.';
  const pairs: [string, string][] = [
    ['TvaWaterVolume', 'TvaWaterVolumeUnit'],
    ['TvaFlowRate', 'TvaFlowRateUnit'],
    ['TvaDuration', 'TvaDurationUnit'],
  ];
  if (
    pairs.some(
      ([valueKey, unitKey]) =>
        hasValue(row[valueKey]) !== hasValue(row[unitKey]),
    )
  )
    return 'Cada medida de la labor requiere su unidad.';
  if (
    [
      'TvaWaterVolume',
      'TvaFlowRate',
      'TvaDuration',
      'TvaPrunedTreeCount',
      'TvaTrapCount',
    ].some((key) => {
      const value = numberValue(row[key]);
      return value != null && value < 0;
    })
  )
    return 'Las medidas de la labor no pueden ser negativas.';
  if (type === 1) {
    if (
      positiveValue(row.OwsID) == null ||
      positiveValue(row.TvaIrrigationType) == null ||
      positiveValue(row.TvaIrrigationSystem) == null
    )
      return 'El riego requiere fuente de agua, tipo y sistema de riego.';
  } else if (
    hasValue(row.OwsID) ||
    hasValue(row.TvaIrrigationType) ||
    hasValue(row.TvaIrrigationSystem) ||
    hasValue(row.TvaFuelType)
  ) {
    return 'Los datos de riego solo corresponden a una labor de riego.';
  }
  if (type === 3 && positiveValue(row.TvaWeedingType) == null)
    return 'Selecciona el tipo de deshierbo.';
  if (type === 4 && positiveValue(row.TvaTrapType) == null)
    return 'Selecciona el tipo de trampa.';
  if (type !== 2 && hasValue(row.TvaPrunedTreeCount))
    return 'La cantidad de árboles podados solo corresponde a la poda.';
  if (type !== 3 && hasValue(row.TvaWeedingType))
    return 'El tipo de deshierbo solo corresponde a esa labor.';
  if (type !== 4 && (hasValue(row.TvaTrapType) || hasValue(row.TvaTrapCount)))
    return 'Los datos de trampas solo corresponden a esa labor.';
  return null;
}

function validateRecommendation(row: TechnicalVisitSnapshotRow) {
  if (positiveValue(row.TvrRecommendationType) == null)
    return 'Selecciona el tipo de recomendación.';
  const supplyId = positiveValue(row.FrsID);
  if (!supplyId && !textValue(row.TvrObjective))
    return 'Describe el objetivo de la recomendación.';
  if (textValue(row.TvrObjective).length > 500)
    return 'El objetivo de la recomendación no debe superar 500 caracteres.';
  if (positiveValue(row.TvrDose) == null)
    return 'Indica una dosis mayor que cero.';
  if (positiveValue(row.TvrDoseUnit) == null)
    return 'Selecciona la unidad de dosis.';
  if (positiveValue(row.TvrSortOrder) == null)
    return 'Indica un orden mayor que cero.';
  if (!supplyId && !textValue(row.TvrProductDescription))
    return 'Selecciona un insumo o describe el producto recomendado.';
  if (textValue(row.TvrProductDescription).length > 500)
    return 'La descripción del producto no debe superar 500 caracteres.';
  if (!supplyId && hasValue(row.FstID))
    return 'El modo observación no debe tener un objetivo de catálogo.';
  return null;
}

function validateCulturalActivity(row: TechnicalVisitSnapshotRow) {
  if (positiveValue(row.TcaActivityType) == null)
    return 'Selecciona el tipo de actividad cultural.';
  if (hasValue(row.TcaStartDate) !== hasValue(row.TcaEndDate))
    return 'Registra ambas fechas de la actividad cultural o déjalas vacías.';
  const start = dateValue(row.TcaStartDate);
  const end = dateValue(row.TcaEndDate);
  if (start && end && end.toMillis() < start.toMillis())
    return 'La fecha de fin de la actividad cultural debe ser posterior al inicio.';
  if (textValue(row.TcaObservation).length > 1000)
    return 'La observación de la actividad cultural no debe superar 1000 caracteres.';
  return null;
}

function validateInstallation(row: TechnicalVisitSnapshotRow) {
  if (positiveValue(row.TinInstallationType) == null)
    return 'Selecciona el tipo de instalación.';
  return null;
}

function validateEvidence(row: TechnicalVisitSnapshotRow) {
  if (row.SecStatus === false) return null;
  if (positiveValue(row.TveFilID) == null && !row.PendingFile)
    return 'Cada evidencia activa necesita un archivo.';
  return null;
}

function hasDuplicate(rows: TechnicalVisitSnapshotRow[], key: string) {
  const values = activeRows(rows)
    .map((row) => numberValue(row[key]))
    .filter((value): value is number => value != null);
  return new Set(values).size !== values.length;
}

export function validateTechnicalVisitSnapshot(
  snapshot: TechnicalVisitSnapshot,
) {
  if (!dateValue(snapshot.Visit.TviPerformedDate))
    return 'La fecha de la visita es obligatoria.';
  const latitude = numberValue(snapshot.Visit.TviLatitude);
  const longitude = numberValue(snapshot.Visit.TviLongitude);
  if ((latitude == null) !== (longitude == null))
    return 'Registre ambas coordenadas GPS o deje ambas vacías.';
  if (latitude != null && (latitude < -90 || latitude > 90))
    return 'La latitud debe estar entre -90 y 90.';
  if (longitude != null && (longitude < -180 || longitude > 180))
    return 'La longitud debe estar entre -180 y 180.';
  const applications = activeRows(snapshot.Applications);
  for (const row of applications) {
    const error = validateApplication(row);
    if (error) return error;
  }
  for (const row of activeRows(snapshot.ApplicationDetails)) {
    const error = validateApplicationDetail(row, applications);
    if (error) return error;
  }
  for (const row of activeRows(snapshot.Diagnoses)) {
    const error = validateDiagnosis(row);
    if (error) return error;
  }
  for (const row of activeRows(snapshot.Phenology)) {
    const error = validatePhenology(row);
    if (error) return error;
  }
  if (hasDuplicate(snapshot.Phenology, 'TphStage'))
    return 'No repitas la misma etapa fenológica en la visita.';
  for (const row of activeRows(snapshot.Activities)) {
    const error = validateActivity(row);
    if (error) return error;
  }
  for (const row of activeRows(snapshot.Recommendations)) {
    const error = validateRecommendation(row);
    if (error) return error;
  }
  for (const row of activeRows(snapshot.CulturalActivities)) {
    const error = validateCulturalActivity(row);
    if (error) return error;
  }
  if (hasDuplicate(snapshot.CulturalActivities, 'TcaActivityType'))
    return 'No repitas el mismo tipo de actividad cultural en la visita.';
  for (const row of activeRows(snapshot.Installations)) {
    const error = validateInstallation(row);
    if (error) return error;
  }
  if (hasDuplicate(snapshot.Installations, 'TinInstallationType'))
    return 'No repitas el mismo tipo de instalación en la visita.';

  const visitId = numberValue(snapshot.Visit.TviID) ?? 0;
  const visitDate = String(snapshot.Visit.TviPerformedDate ?? '');
  const previousRecommendations = previousTechnicalVisitRows(
    snapshot.PreviousRecommendations,
    visitId,
    visitDate,
  );
  const previousCulturalActivities = previousTechnicalVisitRows(
    snapshot.PreviousCulturalActivities,
    visitId,
    visitDate,
  );
  for (const row of activeRows(snapshot.RecommendationFollowUps)) {
    if (positiveValue(row.TrfStatus) == null)
      return 'Selecciona el estado del seguimiento de recomendación.';
    if (
      !previousRecommendations.some(
        (item) => numberValue(item.TvrID) === numberValue(row.TvrID),
      )
    )
      return 'El seguimiento debe corresponder a una recomendación anterior del lote.';
  }
  for (const row of activeRows(snapshot.CulturalActivityFollowUps)) {
    if (positiveValue(row.TcfStatus) == null)
      return 'Selecciona el estado del seguimiento cultural.';
    if (
      !previousCulturalActivities.some(
        (item) => numberValue(item.TcaID) === numberValue(row.TcaID),
      )
    )
      return 'El seguimiento debe corresponder a una actividad cultural anterior del lote.';
  }
  for (const row of snapshot.Evidences) {
    const error = validateEvidence(row);
    if (error) return error;
  }
  return null;
}

export function validateTechnicalVisitSectionRow(
  key: TechnicalVisitSectionKey,
  row: TechnicalVisitSnapshotRow,
  snapshot: TechnicalVisitSnapshot,
  visitDate = String(snapshot.Visit.TviPerformedDate ?? ''),
) {
  if (key === 'Applications') return validateApplication(row);
  if (key === 'ApplicationDetails')
    return validateApplicationDetail(row, snapshot.Applications);
  if (key === 'Diagnoses') return validateDiagnosis(row);
  if (key === 'Phenology') return validatePhenology(row);
  if (key === 'Activities') return validateActivity(row);
  if (key === 'Installations') return validateInstallation(row);
  if (key === 'Recommendations') return validateRecommendation(row);
  if (key === 'CulturalActivities') return validateCulturalActivity(row);
  if (key === 'Evidences') return validateEvidence(row);

  const visitId = numberValue(snapshot.Visit.TviID) ?? 0;
  if (key === 'RecommendationFollowUps') {
    if (positiveValue(row.TrfStatus) == null)
      return 'Selecciona el estado del seguimiento de recomendación.';
    if (
      !previousTechnicalVisitRows(
        snapshot.PreviousRecommendations,
        visitId,
        visitDate,
      ).some((item) => numberValue(item.TvrID) === numberValue(row.TvrID))
    )
      return 'El seguimiento debe corresponder a una recomendación anterior del lote.';
  }
  if (key === 'CulturalActivityFollowUps') {
    if (positiveValue(row.TcfStatus) == null)
      return 'Selecciona el estado del seguimiento cultural.';
    if (
      !previousTechnicalVisitRows(
        snapshot.PreviousCulturalActivities,
        visitId,
        visitDate,
      ).some((item) => numberValue(item.TcaID) === numberValue(row.TcaID))
    )
      return 'El seguimiento debe corresponder a una actividad cultural anterior del lote.';
  }
  return null;
}

export function scheduledTechnicalVisit<
  T extends { TvsID: number; TviID: number },
>(
  schedule: { TvsID: number; TviID?: number | null },
  visits: readonly T[],
): T | undefined {
  return visits.find(
    (visit) =>
      visit.TvsID === schedule.TvsID &&
      (schedule.TviID == null ||
        schedule.TviID <= 0 ||
        visit.TviID === schedule.TviID),
  );
}
