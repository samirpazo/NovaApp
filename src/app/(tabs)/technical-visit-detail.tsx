import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { DateTime } from 'luxon';
import * as React from 'react';
import { Alert, Modal, Platform, ScrollView, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';

import { useAuthStore } from '@/auth/store';
import { Button } from '@/components/ui/button';
import { NText } from '@/components/forms/NText';
import { NDate } from '@/components/forms/NDate';
import { NSignature } from '@/components/forms/NSignature';
import { Text } from '@/components/ui/text';
import { NSwitch } from '@/components/forms/NSwitch';
import { NSelect } from '@/components/forms/NSelect';
import { Q } from '@nozbe/watermelondb';
import { SYNC_RESOURCES } from '@/contracts/sync';
import {
  database,
  GenDefinitionDetailModel,
  GenDefinitionModel,
  OagFarmSuppliesModel,
  OagFarmSuppliesTargetModel,
  OagPlagueCultiveModel,
  OagPlagueModel,
  OagPlotFarmModel,
  OagTechnicalVisitModel,
  OagTechnicalVisitScheduleModel,
  OagWaterSourceModel,
} from '@/database';
import { randomUUID } from 'expo-crypto';
import { formatters } from '@/lib/formatter';
import {
  Building2,
  ClipboardCheck,
  ClipboardList,
  MapPin,
  MapPinned,
  Save,
  Sprout,
  ArrowLeft,
  X,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { loadManagedImage } from '@/lib/managed-image';
import { useSyncState } from '@/sync/state';
import {
  TechnicalVisitSections,
  VisitSectionHeading,
} from '@/components/operationsagr/TechnicalVisitSections';
import {
  parseTechnicalVisitSnapshot,
  previousTechnicalVisitRows,
  validateTechnicalVisitSectionRow,
  validateTechnicalVisitSnapshot,
  type TechnicalVisitSectionKey,
  type TechnicalVisitSnapshot,
  type TechnicalVisitSnapshotRow,
} from '@/lib/technical-visit-validation';

type SectionKey = TechnicalVisitSectionKey;
type SectionField = {
  key: string;
  label: string;
  kind?: 'number' | 'decimal' | 'boolean' | 'datetime';
  required?: boolean;
  definitionCode?: string;
};
type SectionDefinition = {
  key: SectionKey;
  label: string;
  id: string;
  fields: SectionField[];
};

function normalizeSnapshot(
  snapshot: TechnicalVisitSnapshot,
  currentVisitId: number,
): TechnicalVisitSnapshot {
  const visitDate = String(snapshot.Visit.TviPerformedDate ?? '');
  const previousRecommendations = previousTechnicalVisitRows(
    snapshot.PreviousRecommendations,
    currentVisitId,
    visitDate,
  );
  const previousCulturalActivities = previousTechnicalVisitRows(
    snapshot.PreviousCulturalActivities,
    currentVisitId,
    visitDate,
  );
  if (!DateTime.fromISO(visitDate, { setZone: true }).isValid) {
    return {
      ...snapshot,
      PreviousRecommendations: previousRecommendations,
      PreviousCulturalActivities: previousCulturalActivities,
    };
  }
  const recommendationIds = new Set(
    previousRecommendations.map((row) => Number(row.TvrID)),
  );
  const culturalActivityIds = new Set(
    previousCulturalActivities.map((row) => Number(row.TcaID)),
  );
  return {
    ...snapshot,
    PreviousRecommendations: previousRecommendations,
    PreviousCulturalActivities: previousCulturalActivities,
    RecommendationFollowUps: snapshot.RecommendationFollowUps.filter(
      (row) =>
        row.SecStatus === false || recommendationIds.has(Number(row.TvrID)),
    ),
    CulturalActivityFollowUps: snapshot.CulturalActivityFollowUps.filter(
      (row) =>
        row.SecStatus === false || culturalActivityIds.has(Number(row.TcaID)),
    ),
  };
}

const editableSections: SectionDefinition[] = [
  {
    key: 'Evidences',
    label: 'Evidencia',
    id: 'TveID',
    fields: [{ key: 'TveDescription', label: 'Descripción de la evidencia' }],
  },
  {
    key: 'Applications',
    label: 'Aplicaciones',
    id: 'TapID',
    fields: [
      {
        key: 'TapApplicationMode',
        label: 'Modo de aplicación',
        kind: 'number',
        definitionCode: 'OAG_FIELD_APPLICATION_MODE',
      },
      {
        key: 'TapStartDateTime',
        label: 'Inicio',
        kind: 'datetime',
        required: true,
      },
      { key: 'TapEndDateTime', label: 'Fin', kind: 'datetime', required: true },
      { key: 'TapWaterLiters', label: 'Agua (litros)', kind: 'decimal' },
      { key: 'TapFuelExpense', label: 'Combustible', kind: 'decimal' },
      {
        key: 'TapAppliedHectares',
        label: 'Hectáreas aplicadas',
        kind: 'decimal',
      },
      { key: 'TapAppliedPlants', label: 'Plantas aplicadas', kind: 'decimal' },
      { key: 'TapGeneralObservation', label: 'Observación' },
    ],
  },
  {
    key: 'ApplicationDetails',
    label: 'Productos aplicados',
    id: 'TadID',
    fields: [
      {
        key: 'TapID',
        label: 'ID de aplicación',
        kind: 'number',
        required: true,
      },
      { key: 'TadFrsID', label: 'ID de insumo', kind: 'number' },
      { key: 'TadFstID', label: 'ID de objetivo', kind: 'number' },
      {
        key: 'TadProductDescription',
        label: 'Producto o insumo',
        required: true,
      },
      {
        key: 'TadApplicationType',
        label: 'Tipo de aplicación',
        kind: 'number',
        required: true,
        definitionCode: 'OAG_APPLICATION_TYPE',
      },
      { key: 'TadDose', label: 'Dosis', kind: 'decimal' },
      {
        key: 'TadDoseUnit',
        label: 'Unidad de dosis',
        kind: 'number',
        definitionCode: 'OAG_DOSE_UNIT',
      },
      { key: 'TadQuantity', label: 'Cantidad', kind: 'decimal' },
      {
        key: 'TadQuantityUnit',
        label: 'Unidad de cantidad',
        kind: 'number',
        definitionCode: 'OAG_APPLICATION_QUANTITY_UNIT',
      },
      {
        key: 'TadIsObservation',
        label: 'Es solo observación',
        kind: 'boolean',
      },
      { key: 'TadObservation', label: 'Observación' },
    ],
  },
  {
    key: 'Diagnoses',
    label: 'Diagnósticos',
    id: 'TvdID',
    fields: [
      {
        key: 'TvdCategory',
        label: 'Categoría',
        kind: 'number',
        required: true,
        definitionCode: 'OAG_TECHNICAL_DIAGNOSIS_CATEGORY',
      },
      { key: 'PlgID', label: 'ID de plaga', kind: 'number' },
      { key: 'FrsID', label: 'ID de insumo relacionado', kind: 'number' },
      {
        key: 'TvdPlantOrgan',
        label: 'Órgano de la planta',
        kind: 'number',
        definitionCode: 'OAG_PLANT_ORGAN',
      },
      {
        key: 'TvdIncidencePercentage',
        label: 'Incidencia (%)',
        kind: 'decimal',
      },
      { key: 'TvdItemDescription', label: 'Descripción del hallazgo' },
      { key: 'TvdObservation', label: 'Observación' },
    ],
  },
  {
    key: 'Phenology',
    label: 'Fenología',
    id: 'TphID',
    fields: [
      {
        key: 'TphStage',
        label: 'Etapa fenológica',
        kind: 'number',
        required: true,
        definitionCode: 'OAG_PHENOLOGICAL_STAGE',
      },
      {
        key: 'TphPercentage',
        label: 'Porcentaje (%)',
        kind: 'decimal',
        required: true,
      },
    ],
  },
  {
    key: 'Activities',
    label: 'Labores de campo',
    id: 'TvaID',
    fields: [
      {
        key: 'TvaActivityType',
        label: 'Tipo de labor',
        kind: 'number',
        required: true,
        definitionCode: 'OAG_VISIT_CULTURAL_ACTIVITY',
      },
      {
        key: 'TvaIrrigationType',
        label: 'Tipo de riego',
        kind: 'number',
        definitionCode: 'OAG_IRRIGATION_TYPE',
      },
      { key: 'OwsID', label: 'ID de fuente de agua', kind: 'number' },
      {
        key: 'TvaIrrigationSystem',
        label: 'Sistema de riego',
        kind: 'number',
        definitionCode: 'OAG_IRRIGATION_SYSTEM',
      },
      {
        key: 'TvaFuelType',
        label: 'Tipo de combustible',
        kind: 'number',
        definitionCode: 'OAG_FUEL_TYPE',
      },
      { key: 'TvaPrunedTreeCount', label: 'Árboles podados', kind: 'number' },
      {
        key: 'TvaWeedingType',
        label: 'Tipo de deshierbo',
        kind: 'number',
        definitionCode: 'OAG_WEEDING_TYPE',
      },
      {
        key: 'TvaTrapType',
        label: 'Tipo de trampa',
        kind: 'number',
        definitionCode: 'OAG_TRAP_TYPE',
      },
      { key: 'TvaTrapCount', label: 'Cantidad de trampas', kind: 'number' },
      { key: 'TvaStartDate', label: 'Inicio', kind: 'datetime' },
      { key: 'TvaEndDate', label: 'Fin', kind: 'datetime' },
      { key: 'TvaWaterVolume', label: 'Volumen de agua', kind: 'decimal' },
      {
        key: 'TvaWaterVolumeUnit',
        label: 'Unidad de volumen',
        kind: 'number',
        definitionCode: 'OAG_WATER_VOLUME_UNIT',
      },
      { key: 'TvaFlowRate', label: 'Caudal', kind: 'decimal' },
      {
        key: 'TvaFlowRateUnit',
        label: 'Unidad de caudal',
        kind: 'number',
        definitionCode: 'OAG_WATER_FLOW_UNIT',
      },
      { key: 'TvaDuration', label: 'Duración', kind: 'decimal' },
      {
        key: 'TvaDurationUnit',
        label: 'Unidad de duración',
        kind: 'number',
        definitionCode: 'OAG_DURATION_UNIT',
      },
      { key: 'TvaObservation', label: 'Observación' },
    ],
  },
  {
    key: 'Installations',
    label: 'Instalaciones',
    id: 'TinID',
    fields: [
      {
        key: 'TinInstallationType',
        label: 'Tipo de instalación',
        kind: 'number',
        required: true,
        definitionCode: 'OAG_INSTALLATION_TYPE',
      },
      { key: 'TinIsAvailable', label: 'Disponible', kind: 'boolean' },
      { key: 'TinObservation', label: 'Observación' },
    ],
  },
  {
    key: 'Recommendations',
    label: 'Recomendaciones',
    id: 'TvrID',
    fields: [
      {
        key: 'TvrRecommendationType',
        label: 'Tipo de recomendación',
        kind: 'number',
        required: true,
        definitionCode: 'OAG_RECOMMENDATION_TYPE',
      },
      { key: 'TvrObjective', label: 'Objetivo' },
      { key: 'FstID', label: 'ID de objetivo de insumo', kind: 'number' },
      { key: 'FrsID', label: 'ID de insumo', kind: 'number' },
      { key: 'TvrProductDescription', label: 'Producto recomendado' },
      { key: 'TvrDose', label: 'Dosis', kind: 'decimal' },
      {
        key: 'TvrDoseUnit',
        label: 'Unidad de dosis',
        kind: 'number',
        definitionCode: 'OAG_DOSE_UNIT',
      },
      { key: 'TvrSortOrder', label: 'Orden', kind: 'number' },
      { key: 'TvrInstruction', label: 'Instrucción' },
    ],
  },
  {
    key: 'RecommendationFollowUps',
    label: 'Seguimiento de recomendaciones',
    id: 'TrfID',
    fields: [
      {
        key: 'TvrID',
        label: 'ID de recomendación',
        kind: 'number',
        required: true,
      },
      {
        key: 'TrfStatus',
        label: 'Estado',
        kind: 'number',
        required: true,
        definitionCode: 'OAG_RECOMMENDATION_FOLLOW_UP_STATUS',
      },
      { key: 'TrfObservation', label: 'Observación' },
    ],
  },
  {
    key: 'CulturalActivities',
    label: 'Actividades culturales',
    id: 'TcaID',
    fields: [
      {
        key: 'TcaActivityType',
        label: 'Tipo de actividad',
        kind: 'number',
        required: true,
        definitionCode: 'OAG_VISIT_CULTURAL_ACTIVITY',
      },
      { key: 'TcaIsCompleted', label: 'Completada', kind: 'boolean' },
      { key: 'TcaStartDate', label: 'Inicio', kind: 'datetime' },
      { key: 'TcaEndDate', label: 'Fin', kind: 'datetime' },
      { key: 'TcaObservation', label: 'Observación' },
    ],
  },
  {
    key: 'CulturalActivityFollowUps',
    label: 'Seguimiento cultural',
    id: 'TcfID',
    fields: [
      {
        key: 'TcaID',
        label: 'ID de actividad cultural',
        kind: 'number',
        required: true,
      },
      {
        key: 'TcfStatus',
        label: 'Estado',
        kind: 'number',
        required: true,
        definitionCode: 'OAG_RECOMMENDATION_FOLLOW_UP_STATUS',
      },
      { key: 'TcfObservation', label: 'Observación' },
    ],
  },
];

export default function TechnicalVisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const userId = useAuthStore((state) => state.Session?.User.UsrID ?? 0);
  const [model, setModel] = React.useState<OagTechnicalVisitModel | null>(null);
  const [schedule, setSchedule] =
    React.useState<OagTechnicalVisitScheduleModel | null>(null);
  const [snapshot, setSnapshot] = React.useState<TechnicalVisitSnapshot | null>(
    null,
  );
  const [date, setDate] = React.useState('');
  const [latitude, setLatitude] = React.useState('');
  const [longitude, setLongitude] = React.useState('');
  const [observation, setObservation] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [draftDirty, setDraftDirty] = React.useState(false);
  const draftDirtyRef = React.useRef(false);
  const [saveFeedback, setSaveFeedback] = React.useState<{
    message: string;
    error: boolean;
  } | null>(null);
  const [activeSection, setActiveSection] =
    React.useState<SectionDefinition | null>(null);
  const [editingRow, setEditingRow] =
    React.useState<TechnicalVisitSnapshotRow | null>(null);
  const [sectionValues, setSectionValues] = React.useState<
    Record<string, string | boolean>
  >({});
  const [definitionOptions, setDefinitionOptions] = React.useState<
    Record<string, { label: string; value: number }[]>
  >({});
  const [catalogOptions, setCatalogOptions] = React.useState<{
    supplies: { label: string; value: number }[];
    targets: {
      label: string;
      value: number;
      FrsID: number;
      PlgID: number;
      CltID: number;
    }[];
    plagues: { label: string; value: number }[];
    waterSources: { label: string; value: number }[];
  }>({ supplies: [], targets: [], plagues: [], waterSources: [] });
  const [plotCropId, setPlotCropId] = React.useState<number | null>(null);
  const markDraftDirty = () => {
    draftDirtyRef.current = true;
    setDraftDirty(true);
    setSaveFeedback(null);
  };
  const applicationOptions = React.useMemo(
    () =>
      (snapshot?.Applications ?? [])
        .filter((row) => row.SecStatus !== false)
        .map((row) => ({
          label: `#${String(row.TapID)} · ${row.TapStartDateTime ? formatters.datetime(String(row.TapStartDateTime)) : 'Sin fecha'}`,
          value: Number(row.TapID),
        }))
        .filter((item) => Number.isFinite(item.value)),
    [snapshot],
  );
  const previousRecommendationOptions = React.useMemo(
    () =>
      (snapshot?.PreviousRecommendations ?? [])
        .filter((row) => row.SecStatus !== false)
        .map((row) => ({
          label: `#${String(row.TvrID)} · ${String(row.TvrProductDescription || row.TvrObjective || 'Recomendación')}`,
          value: Number(row.TvrID),
        }))
        .filter((item) => Number.isFinite(item.value)),
    [snapshot],
  );
  const previousCulturalActivityOptions = React.useMemo(
    () =>
      (snapshot?.PreviousCulturalActivities ?? [])
        .filter((row) => row.SecStatus !== false)
        .map((row) => ({
          label: `#${String(row.TcaID)} · Actividad cultural anterior`,
          value: Number(row.TcaID),
        }))
        .filter((item) => Number.isFinite(item.value)),
    [snapshot],
  );

  React.useEffect(() => {
    void Promise.all([
      database
        .get<GenDefinitionModel>('GenDefinition')
        .query(Q.where('SecStatus', true))
        .fetch(),
      database
        .get<GenDefinitionDetailModel>('GenDefinitionDetail')
        .query(Q.where('SecStatus', true))
        .fetch(),
    ])
      .then(([definitions, details]) => {
        const codes = new Map(
          definitions.map((definition) => [
            definition.DefID,
            definition.DefCode,
          ]),
        );
        const options: Record<string, { label: string; value: number }[]> = {};
        for (const detail of details) {
          const code = codes.get(detail.DefID);
          if (!code) continue;
          (options[code] ??= []).push({
            label: detail.DedDescription,
            value: detail.DedValue,
          });
        }
        setDefinitionOptions(options);
      })
      .catch(() => setDefinitionOptions({}));
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void Promise.all([
      database
        .get<OagFarmSuppliesModel>(SYNC_RESOURCES.OagFarmSupplies)
        .query(Q.where('SecStatus', true))
        .fetch(),
      database
        .get<OagFarmSuppliesTargetModel>(SYNC_RESOURCES.OagFarmSuppliesTarget)
        .query(Q.where('SecStatus', true))
        .fetch(),
      database
        .get<OagPlagueModel>(SYNC_RESOURCES.OagPlague)
        .query(Q.where('SecStatus', true))
        .fetch(),
      database
        .get<OagPlagueCultiveModel>(SYNC_RESOURCES.OagPlagueCultive)
        .query(Q.where('SecStatus', true))
        .fetch(),
      database
        .get<OagWaterSourceModel>(SYNC_RESOURCES.OagWaterSource)
        .query(Q.where('SecStatus', true))
        .fetch(),
    ])
      .then(([supplies, targets, plagues, plagueCultives, waterSources]) => {
        if (cancelled) return;
        const plagueNames = new Map(
          plagues.map((plague) => [plague.PlgID, plague.PlgDescription]),
        );
        setCatalogOptions({
          supplies: supplies.map((item) => ({
            label: item.FrsDescription,
            value: item.FrsID,
          })),
          targets: targets.map((item) => ({
            label: `${plagueNames.get(item.PlgID) ?? 'Objetivo'} · ${item.FstID}`,
            value: item.FstID,
            FrsID: item.FrsID,
            PlgID: item.PlgID,
            CltID: item.CltID,
          })),
          plagues: plagues
            .filter(
              (plague) =>
                !plotCropId ||
                plagueCultives.some(
                  (relation) =>
                    relation.CltID === plotCropId &&
                    relation.PlgID === plague.PlgID,
                ) ||
                targets.some(
                  (target) =>
                    target.CltID === plotCropId &&
                    target.PlgID === plague.PlgID,
                ),
            )
            .map((item) => ({ label: item.PlgDescription, value: item.PlgID })),
          waterSources: waterSources
            .filter((item) => item.PlfID === schedule?.PlfID)
            .map((item) => ({ label: item.OwsName, value: item.OwsID })),
        });
      })
      .catch(() =>
        setCatalogOptions({
          supplies: [],
          targets: [],
          plagues: [],
          waterSources: [],
        }),
      );
    return () => {
      cancelled = true;
    };
  }, [plotCropId, schedule?.PlfID]);

  React.useEffect(() => {
    let cancelled = false;
    const plotId = schedule?.PlfID;
    if (!plotId) {
      setPlotCropId(null);
      return;
    }
    void database
      .get<OagPlotFarmModel>(SYNC_RESOURCES.OagPlotFarm)
      .query(Q.where('SecStatus', true), Q.where('PlfID', plotId))
      .fetch()
      .then((plots) => {
        if (!cancelled) setPlotCropId(plots[0]?.CltID ?? null);
      })
      .catch(() => {
        if (!cancelled) setPlotCropId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [schedule?.PlfID]);

  const [signaturePreview, setSignaturePreview] = React.useState<string | null>(
    null,
  );
  const signatureFileId = Number(snapshot?.Visit.TviSignatureFilID) || 0;
  React.useEffect(() => {
    let cancelled = false;
    setSignaturePreview(null);
    if (signatureFileId > 0) {
      void loadManagedImage(signatureFileId)
        .then((uri) => {
          if (!cancelled) setSignaturePreview(uri);
        })
        .catch(() => {
          /* The registered signature remains valid when its preview is unavailable. */
        });
    }
    return () => {
      cancelled = true;
    };
  }, [signatureFileId]);

  const syncFinishedAt = useSyncState((state) => state.LastPull?.FinishedAt);
  const hydratedFields = React.useRef<{
    id: string;
    date: string;
    latitude: string;
    longitude: string;
    observation: string;
  } | null>(null);

  const loadVisit = React.useCallback(
    async (isCancelled: () => boolean) => {
      if (!id) return;
      try {
        const record = await database
          .get<OagTechnicalVisitModel>(SYNC_RESOURCES.OagTechnicalVisit)
          .find(id);
        const normalized = normalizeSnapshot(
          parseTechnicalVisitSnapshot(record.Snapshot),
          record.TviID,
        );
        const schedules = await database
          .get<OagTechnicalVisitScheduleModel>(
            SYNC_RESOURCES.OagTechnicalVisitSchedule,
          )
          .query(Q.where('TvsID', record.TvsID), Q.where('SecStatus', true))
          .fetch();
        if (isCancelled() || draftDirtyRef.current) return;
        setModel(record);
        setSnapshot(normalized);
        setDraftDirty(false);
        setSchedule(schedules[0] ?? null);
        const nextFields = {
          id: record.id,
          date: String(
            normalized.Visit.TviPerformedDate ?? record.TviPerformedDate,
          ),
          latitude:
            normalized.Visit.TviLatitude == null
              ? ''
              : String(normalized.Visit.TviLatitude),
          longitude:
            normalized.Visit.TviLongitude == null
              ? ''
              : String(normalized.Visit.TviLongitude),
          observation: String(normalized.Visit.TviObservation ?? ''),
        };
        const previous = hydratedFields.current;
        const reset = previous?.id !== record.id;
        setDate((current) =>
          reset || current === previous?.date ? nextFields.date : current,
        );
        setLatitude((current) =>
          reset || current === previous?.latitude
            ? nextFields.latitude
            : current,
        );
        setLongitude((current) =>
          reset || current === previous?.longitude
            ? nextFields.longitude
            : current,
        );
        setObservation((current) =>
          reset || current === previous?.observation
            ? nextFields.observation
            : current,
        );
        hydratedFields.current = nextFields;
      } catch {
        if (!isCancelled())
          Alert.alert(
            'Visita no disponible',
            'No se encontró el borrador local.',
          );
      }
    },
    [id],
  );

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      void loadVisit(() => cancelled);
      return () => {
        cancelled = true;
      };
    }, [loadVisit]),
  );

  React.useEffect(() => {
    if (!syncFinishedAt) return;
    let cancelled = false;
    void loadVisit(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [loadVisit, syncFinishedAt]);

  const save = async () => {
    if (!model || !snapshot) return;
    setSaveFeedback(null);
    const parsedDate = DateTime.fromISO(date.trim(), { setZone: true });
    const lat = latitude.trim() ? Number(latitude) : null;
    const lon = longitude.trim() ? Number(longitude) : null;
    if (
      !parsedDate.isValid ||
      (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) ||
      (lon !== null && (!Number.isFinite(lon) || lon < -180 || lon > 180))
    ) {
      setSaveFeedback({
        message: 'Revisa la fecha y las coordenadas.',
        error: true,
      });
      return;
    }
    const now = DateTime.utc().toISO() ?? '';
    const next: TechnicalVisitSnapshot = {
      ...snapshot,
      Visit: {
        ...snapshot.Visit,
        TviPerformedDate: parsedDate.toUTC().toISO(),
        TviLatitude: lat,
        TviLongitude: lon,
        TviObservation: observation.trim() || null,
        UpdateUserId: userId,
        UpdateDate: now,
      },
    };
    const validationError = validateTechnicalVisitSnapshot(next);
    if (validationError) {
      setSaveFeedback({ message: validationError, error: true });
      return;
    }
    setSaving(true);
    let signatureFile: File | null = null;
    let saved = false;
    try {
      let snapshotToSave = next;
      const pendingSignature = next.PendingSignatureFile;
      if (
        Platform.OS !== 'web' &&
        pendingSignature?.uri.startsWith('data:image/png;base64,')
      ) {
        signatureFile = new File(
          Paths.document,
          `technical-visit-signature-${randomUUID()}.png`,
        );
        signatureFile.create({ intermediates: true });
        signatureFile.write(
          pendingSignature.uri.slice('data:image/png;base64,'.length),
          { encoding: 'base64' },
        );
        snapshotToSave = {
          ...next,
          PendingSignatureFile: { ...pendingSignature, uri: signatureFile.uri },
        };
      }
      await database.write(() =>
        model.update((record) => {
          record.TviPerformedDate = String(next.Visit.TviPerformedDate);
          record.TviLatitude = lat;
          record.TviLongitude = lon;
          record.TviObservation = observation.trim() || null;
          record.UpdateUserId = userId;
          record.UpdateDate = now;
          record.Snapshot = JSON.stringify(snapshotToSave);
        }),
      );
      draftDirtyRef.current = false;
      setDraftDirty(false);
      saved = true;
    } catch (error) {
      try {
        signatureFile?.delete();
      } catch {
        /* File may not have been created. */
      }
      setSaveFeedback({
        message:
          error instanceof Error
            ? error.message
            : 'No se pudieron guardar los cambios.',
        error: true,
      });
    } finally {
      setSaving(false);
    }
    if (saved) router.replace('/technical-visits');
  };

  const chooseImage = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'image/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return null;
    const asset = result.assets[0];
    return { uri: asset.uri, name: asset.name, mimeType: asset.mimeType };
  };

  const saveSignature = async (file: {
    uri: string;
    name: string;
    mimeType?: string | null;
  }) => {
    if (!model || !snapshot) return;
    const next = { ...snapshot, PendingSignatureFile: file };
    setSnapshot(next);
    markDraftDirty();
    setSaveFeedback({
      message:
        'Firma lista. Se guardará junto con la visita al presionar Guardar cambios.',
      error: false,
    });
  };

  const attachEvidence = async () => {
    if (!model || !snapshot) return;
    const file = await chooseImage();
    if (!file) return;
    const now = DateTime.utc().toISO() ?? '';
    const ownerId = userId;
    const primaryId = -Math.floor(Date.now());
    const evidence = {
      SyncId: randomUUID(),
      SyncVersion: '',
      SecStatus: true,
      CreateUserId: ownerId,
      UpdateUserId: ownerId,
      DeleteUserId: null,
      CreateDate: now,
      UpdateDate: now,
      DeleteDate: null,
      TveID: primaryId,
      TviID: model.TviID,
      TveFilID: 0,
      TveDescription: file.name,
      PendingFile: file,
    };
    const next = { ...snapshot, Evidences: [...snapshot.Evidences, evidence] };
    setSnapshot(next);
    markDraftDirty();
    setSaveFeedback({
      message:
        'Evidencia agregada al borrador. Presiona Guardar cambios para conservar la visita.',
      error: false,
    });
  };

  const openSectionRow = (
    definition: SectionDefinition,
    row?: Record<string, unknown>,
  ) => {
    const initial = Object.fromEntries(
      definition.fields.map((field) => [
        field.key,
        field.kind === 'boolean'
          ? Boolean(row?.[field.key])
          : row?.[field.key] == null
            ? ''
            : String(row[field.key]),
      ]),
    ) as Record<string, string | boolean>;
    if (!row && definition.key === 'Applications') {
      const start = DateTime.now().startOf('minute');
      initial.TapStartDateTime = start.toISO() ?? '';
      initial.TapEndDateTime = start.plus({ hours: 1 }).toISO() ?? '';
    }
    if (!row && definition.key === 'ApplicationDetails') {
      const first = snapshot?.Applications.find(
        (item) => item.SecStatus !== false,
      );
      if (first?.TapID != null) initial.TapID = String(first.TapID);
    }
    if (!row && definition.key === 'RecommendationFollowUps') {
      const first = snapshot?.PreviousRecommendations.find(
        (item) => item.SecStatus !== false,
      );
      if (first?.TvrID != null) initial.TvrID = String(first.TvrID);
    }
    if (!row && definition.key === 'CulturalActivityFollowUps') {
      const first = snapshot?.PreviousCulturalActivities.find(
        (item) => item.SecStatus !== false,
      );
      if (first?.TcaID != null) initial.TcaID = String(first.TcaID);
    }
    setSectionValues(initial);
    setEditingRow(row ?? null);
    setActiveSection(definition);
  };

  const openSection = (
    key: SectionKey,
    row?: TechnicalVisitSnapshotRow,
    parent?: TechnicalVisitSnapshotRow,
  ) => {
    const definition = editableSections.find((item) => item.key === key);
    if (!definition) return;
    openSectionRow(definition, row);
    if (parent) {
      const relation =
        key === 'ApplicationDetails'
          ? 'TapID'
          : key === 'RecommendationFollowUps'
            ? 'TvrID'
            : 'TcaID';
      setSectionValues((current) => ({
        ...current,
        [relation]: String(parent[relation]),
      }));
    }
  };

  const saveSectionRow = async () => {
    if (!model || !snapshot || !activeSection) return;
    const data: Record<string, unknown> = {};
    for (const field of activeSection.fields) {
      const value = sectionValues[field.key];
      if (field.required && (value === '' || value === undefined)) {
        Alert.alert(
          'Completa los datos',
          'El campo «' + field.label + '» es obligatorio.',
        );
        return;
      }
      if (field.kind === 'boolean') {
        data[field.key] = Boolean(value);
      } else if (field.kind === 'number' || field.kind === 'decimal') {
        if (value === '' || value === undefined) data[field.key] = null;
        else {
          const number = Number(value);
          if (!Number.isFinite(number)) {
            Alert.alert(
              'Dato inválido',
              'Revisa el valor de «' + field.label + '».',
            );
            return;
          }
          data[field.key] = number;
        }
      } else if (field.kind === 'datetime') {
        const parsed = value
          ? DateTime.fromISO(String(value), { setZone: true })
          : null;
        if (field.required && !parsed?.isValid) {
          Alert.alert('Fecha inválida', 'Revisa «' + field.label + '».');
          return;
        }
        data[field.key] = parsed?.isValid ? parsed.toUTC().toISO() : null;
      } else {
        data[field.key] =
          typeof value === 'string' ? value.trim() || null : null;
      }
    }
    const now = DateTime.utc().toISO() ?? '';
    const rows = snapshot[activeSection.key] as TechnicalVisitSnapshotRow[];
    const primaryId = editingRow
      ? editingRow[activeSection.id]
      : -Date.now() - rows.length;
    const base = editingRow ?? {
      SyncId: randomUUID(),
      SyncVersion: '',
      SecStatus: true,
      CreateUserId: userId,
      UpdateUserId: userId,
      DeleteUserId: null,
      CreateDate: now,
      UpdateDate: now,
      DeleteDate: null,
    };
    const nextRow: TechnicalVisitSnapshotRow = {
      ...base,
      ...data,
      [activeSection.id]: primaryId,
      TviID: model.TviID,
      UpdateUserId: userId,
      UpdateDate: now,
    };
    const next: TechnicalVisitSnapshot = {
      ...snapshot,
      [activeSection.key]: editingRow
        ? rows.map((row) => (row === editingRow ? nextRow : row))
        : [...rows, nextRow],
    };
    const validationError = validateTechnicalVisitSectionRow(
      activeSection.key,
      nextRow,
      next,
      String(next.Visit.TviPerformedDate ?? ''),
    );
    if (validationError) {
      Alert.alert('Revisa la sección', validationError);
      return;
    }
    setSnapshot(next);
    markDraftDirty();
    setActiveSection(null);
    setEditingRow(null);
  };

  const removeSectionRow = (
    definition: SectionDefinition,
    row: Record<string, unknown>,
  ) => {
    if (!model || !snapshot) return;
    const now = DateTime.utc().toISO() ?? '';
    const rows = snapshot[definition.key] as TechnicalVisitSnapshotRow[];
    const remove = (item: TechnicalVisitSnapshotRow) =>
      item === row
        ? { ...item, SecStatus: false, DeleteUserId: userId, DeleteDate: now }
        : item;
    let next: TechnicalVisitSnapshot = {
      ...snapshot,
      [definition.key]: rows.map(remove),
    };
    if (definition.key === 'Applications') {
      next = {
        ...next,
        ApplicationDetails: next.ApplicationDetails.map((item) =>
          Number(item.TapID) === Number(row.TapID)
            ? {
                ...item,
                SecStatus: false,
                DeleteUserId: userId,
                DeleteDate: now,
              }
            : item,
        ),
      };
    }
    if (definition.key === 'Recommendations') {
      next = {
        ...next,
        RecommendationFollowUps: next.RecommendationFollowUps.map((item) =>
          Number(item.TvrID) === Number(row.TvrID)
            ? {
                ...item,
                SecStatus: false,
                DeleteUserId: userId,
                DeleteDate: now,
              }
            : item,
        ),
      };
    }
    if (definition.key === 'CulturalActivities') {
      next = {
        ...next,
        CulturalActivityFollowUps: next.CulturalActivityFollowUps.map((item) =>
          Number(item.TcaID) === Number(row.TcaID)
            ? {
                ...item,
                SecStatus: false,
                DeleteUserId: userId,
                DeleteDate: now,
              }
            : item,
        ),
      };
    }
    setSnapshot(next);
    markDraftDirty();
  };

  const saveCatalogValue = (
    key: 'Phenology' | 'Installations',
    option: { label: string; value: number },
    field: 'TphPercentage' | 'TinIsAvailable',
    value: string | boolean,
  ) => {
    if (!model || !snapshot) return;
    const rows = snapshot[key] as Record<string, unknown>[];
    const stageKey = key === 'Phenology' ? 'TphStage' : 'TinInstallationType';
    const existing = rows.find((row) => row[stageKey] === option.value);
    const now = DateTime.utc().toISO() ?? '';
    const updated = {
      ...existing,
      SyncId: existing?.SyncId ?? randomUUID(),
      SyncVersion: existing?.SyncVersion ?? '',
      SecStatus: true,
      CreateUserId: existing?.CreateUserId ?? userId,
      UpdateUserId: userId,
      DeleteUserId: null,
      CreateDate: existing?.CreateDate ?? now,
      UpdateDate: now,
      DeleteDate: null,
      [key === 'Phenology' ? 'TphID' : 'TinID']:
        existing?.[key === 'Phenology' ? 'TphID' : 'TinID'] ?? -Date.now(),
      TviID: model.TviID,
      [stageKey]: option.value,
      [field]: field === 'TphPercentage' ? Number(value) : value,
    };
    const next = {
      ...snapshot,
      [key]: existing
        ? rows.map((row) => (row === existing ? updated : row))
        : [...rows, updated],
    };
    setSnapshot(next);
    markDraftDirty();
  };

  const updatePhenology = (
    option: { label: string; value: number },
    value: string,
  ) => {
    if (!snapshot) return;
    const percentage = Number(value) || 0;
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100)
      return;
    const rows = snapshot.Phenology as Record<string, unknown>[];
    const otherTotal = rows
      .filter((row) => row.SecStatus !== false && row.TphStage !== option.value)
      .reduce((sum, row) => sum + (Number(row.TphPercentage) || 0), 0);
    if (otherTotal + percentage > 100) {
      Alert.alert(
        'Porcentaje excedido',
        'El total fenológico no puede superar 100 %.',
      );
      return;
    }
    void saveCatalogValue('Phenology', option, 'TphPercentage', value);
  };

  if (!model || !snapshot || model.id !== id)
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Cargando visita guardada…</Text>
      </View>
    );

  const signatureUri = snapshot.PendingSignatureFile?.uri ?? signaturePreview;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="mx-auto w-full max-w-7xl gap-4 px-3 py-3 pb-24 md:gap-6 md:px-4 md:py-5 md:pb-28"
    >
      <View className="flex-row items-center gap-3">
        <Button
          size="icon"
          variant="ghost"
          accessibilityLabel="Volver a programaciones"
          onPress={() => router.replace('/technical-visits')}
        >
          <ArrowLeft
            size={20}
            className="text-foreground"
          />
        </Button>
        <View className="flex-1">
          <Text className="text-xl font-poppins-semibold">
            Editar visita técnica
            {schedule?.PlfName ? ` · ${schedule.PlfName}` : ''}
          </Text>
          <Text className="text-xs text-muted-foreground">
            Programación #{model.TvsID} ·{' '}
            {model.TviDocumentNumber
              ? `Documento ${model.TviDocumentSeries ?? '1'}-${model.TviDocumentNumber}`
              : 'Borrador local'}
          </Text>
        </View>
      </View>
      <View className="gap-3 rounded-xl border border-border p-3 md:gap-4 md:p-5">
        <VisitSectionHeading
          title="Información del documento"
          subtitle="Datos de identificación de la visita técnica"
          icon={ClipboardList}
        />
        <View className="flex-row flex-wrap gap-3 md:gap-4">
          <NDate
            label="Fecha y hora"
            mode="datetime"
            value={date}
            onChange={(value) => {
              setDate(value);
              markDraftDirty();
            }}
            required
            containerClassName="min-w-[180px] flex-1"
          />
          <VisitValue
            label="Supervisor"
            value={schedule?.ResponsibleName}
            boxed
          />
          <VisitValue
            label="ID Prog."
            value={model.TvsID}
            boxed
          />
          <VisitValue
            label="Serie"
            value={snapshot.Visit.TviDocumentSeries ?? 'Al sincronizar'}
            boxed
          />
          <VisitValue
            label="Correlativo"
            value={snapshot.Visit.TviDocumentNumber ?? 'Al sincronizar'}
            boxed
          />
        </View>
      </View>
      <View className="gap-3 md:gap-4">
        <VisitSectionHeading
          title="Información del lote"
          icon={MapPin}
        />
        <View className="flex-row flex-wrap gap-3 md:gap-4">
          <VisitValue
            label="ID lote"
            value={schedule?.PlfID}
            boxed
          />
          <VisitValue
            label="Campaña"
            value={schedule?.CmpName}
            boxed
          />
        </View>
        <View className="gap-4 rounded-xl border border-border p-3 md:flex-row md:gap-5 md:p-5">
          <View className="min-w-0 flex-1 gap-3">
            <LotHeading
              title="Datos del lote"
              icon={Sprout}
            />
            <LotValue
              label="Nombre"
              value={schedule?.PlfName}
            />
            <LotValue
              label="Variedad"
              value={schedule?.VrtDescription}
            />
            <LotValue
              label="Tipo cultivo"
              value={schedule?.TypeCropDescription ?? schedule?.CltDescription}
            />
          </View>
          <View className="min-w-0 flex-1 gap-3">
            <LotHeading
              title="Productor y fundo"
              icon={Building2}
            />
            <LotValue
              label="Productor"
              value={schedule?.ProducerName}
            />
            <LotValue
              label="Fundo"
              value={schedule?.FrfName}
            />
            <LotValue
              label="Dirección"
              value={schedule?.FrfAddress}
            />
          </View>
          <View className="min-w-0 flex-1 gap-3">
            <LotHeading
              title="Ubicación"
              icon={MapPinned}
            />
            <LotValue
              label="Zona"
              value={schedule?.ZonDescription}
            />
            <LotValue
              label="Subzona"
              value={schedule?.SzoDescription}
            />
          </View>
        </View>
      </View>
      <TechnicalVisitSections
        snapshot={snapshot}
        options={definitionOptions}
        onAdd={(key, parent) => openSection(key, undefined, parent)}
        onEdit={(key, row) => openSection(key, row)}
        onRemove={(key, row) => {
          const definition = editableSections.find((item) => item.key === key);
          if (definition) void removeSectionRow(definition, row);
        }}
        onPhenology={updatePhenology}
        onInstallation={(option, value) =>
          void saveCatalogValue(
            'Installations',
            option,
            'TinIsAvailable',
            value,
          )
        }
        onEvidence={() => void attachEvidence()}
      />
      <View className="gap-3 md:gap-4">
        <VisitSectionHeading
          title="Visita realizada"
          subtitle="Completa ubicación, observaciones generales y firma del productor"
          icon={ClipboardCheck}
        />
        <View className="flex-row flex-wrap gap-3 md:gap-4">
          <NText
            label="Latitud GPS"
            value={latitude}
            onChange={(value) => {
              setLatitude(value);
              markDraftDirty();
            }}
            placeholder="Latitud"
            containerClassName="min-w-[140px] flex-1"
          />
          <NText
            label="Longitud GPS"
            value={longitude}
            onChange={(value) => {
              setLongitude(value);
              markDraftDirty();
            }}
            placeholder="Longitud"
            containerClassName="min-w-[140px] flex-1"
          />
        </View>
        <View className="gap-3 md:flex-row md:gap-4">
          <NText
            multiline
            numberOfLines={6}
            className="min-h-40 py-3"
            label="Observaciones generales"
            value={observation}
            onChange={(value) => {
              setObservation(value);
              markDraftDirty();
            }}
            placeholder="Describe los hallazgos del recorrido"
            containerClassName="min-w-0 flex-1"
          />
          <View className="min-w-0 flex-1 gap-3">
            <View
              className={`h-40 items-center justify-center overflow-hidden rounded-xl border border-border ${signatureUri ? 'bg-white' : 'bg-muted/40'}`}
            >
              {signatureUri ? (
                <Image
                  source={{ uri: signatureUri }}
                  contentFit="contain"
                  style={{ width: '100%', height: '100%' }}
                  accessibilityLabel="Firma del productor"
                />
              ) : (
                <Text className="text-sm text-muted-foreground">
                  {signatureFileId > 0
                    ? 'Firma registrada · vista previa no disponible'
                    : 'Firma del productor'}
                </Text>
              )}
            </View>
            <NSignature
              onSave={saveSignature}
              disabled={saving}
              hasSignature={Boolean(signatureUri || signatureFileId > 0)}
            />
          </View>
        </View>
        <View className="items-end border-t border-border pt-4">
          <Button
            disabled={saving}
            onPress={() => void save()}
          >
            <Save
              size={16}
              className="text-primary-foreground"
            />
            <Text>{saving ? 'Guardando…' : 'Guardar cambios'}</Text>
          </Button>
          <Text
            role={saveFeedback?.error ? 'alert' : undefined}
            className={`mt-2 text-xs ${saveFeedback?.error ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            {saveFeedback?.message ??
              (draftDirty
                ? 'Hay cambios sin guardar. Presiona Guardar cambios para conservar la visita.'
                : 'Guardado en este dispositivo. Se envía al sincronizar.')}
          </Text>
        </View>
      </View>
      <Modal
        visible={activeSection !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveSection(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 px-4 py-6">
          <ScrollView
            className="max-h-[90%] w-full max-w-3xl rounded-xl border border-border bg-background"
            contentContainerClassName="gap-4 p-5"
          >
            <View className="flex-row items-center justify-between gap-3 border-b border-border pb-3">
              <Text className="flex-1 text-xl font-poppins-semibold">
                {editingRow ? 'Editar ' : 'Agregar '}
                {activeSection?.label}
              </Text>
              <Button
                variant="ghost"
                size="icon"
                accessibilityLabel="Cerrar formulario"
                onPress={() => setActiveSection(null)}
              >
                <X
                  size={18}
                  className="text-muted-foreground"
                />
              </Button>
            </View>
            {activeSection?.fields.map((field) => {
              const selectedSupplyId = Number(
                sectionValues.TadFrsID || sectionValues.FrsID || 0,
              );
              const fieldOptions =
                field.key === 'TadFrsID' || field.key === 'FrsID'
                  ? catalogOptions.supplies
                  : field.key === 'TadFstID' || field.key === 'FstID'
                    ? catalogOptions.targets
                        .filter(
                          (item) =>
                            (!plotCropId || item.CltID === plotCropId) &&
                            (!selectedSupplyId ||
                              item.FrsID === selectedSupplyId),
                        )
                        .map(({ label, value }) => ({ label, value }))
                    : field.key === 'PlgID'
                      ? catalogOptions.plagues
                      : field.key === 'OwsID'
                        ? catalogOptions.waterSources
                        : null;
              const items = field.definitionCode
                ? (definitionOptions[field.definitionCode] ?? [])
                : fieldOptions
                  ? fieldOptions
                  : field.key === 'TapID'
                    ? applicationOptions
                    : field.key === 'TvrID'
                      ? previousRecommendationOptions
                      : field.key === 'TcaID'
                        ? previousCulturalActivityOptions
                        : null;
              if (items) {
                return (
                  <NSelect
                    key={field.key}
                    label={field.label}
                    items={items}
                    itemText="label"
                    itemValue="value"
                    value={
                      sectionValues[field.key] === ''
                        ? null
                        : Number(sectionValues[field.key])
                    }
                    onChange={(value) =>
                      setSectionValues((current) => {
                        const next = {
                          ...current,
                          [field.key]: value == null ? '' : String(value),
                        };
                        if (field.key === 'TadFrsID' && value != null) {
                          const supply = catalogOptions.supplies.find(
                            (item) => item.value === Number(value),
                          );
                          if (supply) next.TadProductDescription = supply.label;
                          next.TadFstID = '';
                        }
                        if (field.key === 'FrsID' && value != null) {
                          const supply = catalogOptions.supplies.find(
                            (item) => item.value === Number(value),
                          );
                          if (supply) next.TvrProductDescription = supply.label;
                          next.FstID = '';
                        }
                        return next;
                      })
                    }
                    placeholder="Selecciona una opción descargada"
                    searchable
                    clearable
                    required={field.required}
                  />
                );
              }
              return field.kind === 'boolean' ? (
                <NSwitch
                  key={field.key}
                  label={field.label}
                  value={Boolean(sectionValues[field.key])}
                  onValueChange={(value) =>
                    setSectionValues((current) => ({
                      ...current,
                      [field.key]: value,
                    }))
                  }
                />
              ) : field.kind === 'datetime' ? (
                <NDate
                  key={field.key}
                  label={field.label}
                  mode="datetime"
                  value={String(sectionValues[field.key] || '')}
                  onChange={(value) =>
                    setSectionValues((current) => ({
                      ...current,
                      [field.key]: value,
                    }))
                  }
                />
              ) : (
                <NText
                  key={field.key}
                  accessibilityLabel={field.label}
                  label={field.label}
                  value={String(sectionValues[field.key] ?? '')}
                  onChange={(value) =>
                    setSectionValues((current) => ({
                      ...current,
                      [field.key]: value,
                    }))
                  }
                  number={field.kind === 'number'}
                  decimal={field.kind === 'decimal'}
                  required={field.required}
                />
              );
            })}
            <View className="flex-row justify-end gap-3 border-t border-border pt-3">
              <Button
                variant="outline"
                onPress={() => setActiveSection(null)}
              >
                <Text>Cancelar</Text>
              </Button>
              <Button onPress={() => void saveSectionRow()}>
                <Save
                  size={16}
                  className="text-primary-foreground"
                />
                <Text>
                  {editingRow ? 'Aplicar cambios' : 'Agregar al borrador'}
                </Text>
              </Button>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

function VisitValue({
  label,
  value,
  boxed = false,
}: {
  label: string;
  value: unknown;
  boxed?: boolean;
}) {
  return (
    <View className="min-w-[100px] flex-1 gap-1.5">
      <Text className="text-[10px] font-poppins-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Text>
      <View
        className={
          boxed
            ? 'min-h-10 justify-center rounded-md border border-border px-3 py-2'
            : ''
        }
      >
        <Text className="text-sm">
          {value == null || value === '' ? '—' : String(value)}
        </Text>
      </View>
    </View>
  );
}

function LotHeading({
  title,
  icon: Icon,
}: {
  title: string;
  icon: typeof Sprout;
}) {
  return (
    <View className="mb-1 flex-row items-center gap-2">
      <View className="rounded-lg bg-primary/10 p-2">
        <Icon
          size={17}
          className="text-primary"
        />
      </View>
      <Text className="text-[11px] font-poppins-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </Text>
    </View>
  );
}

function LotValue({ label, value }: { label: string; value: unknown }) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="min-w-0 flex-1 text-right text-sm">
        {value == null || value === '' ? '—' : String(value)}
      </Text>
    </View>
  );
}
