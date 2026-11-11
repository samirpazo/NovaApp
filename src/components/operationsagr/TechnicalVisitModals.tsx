import { DateTime } from 'luxon';
import {
  ClipboardCheck,
  ClipboardList,
  ImagePlus,
  Sprout,
  X,
} from 'lucide-react-native';
import * as React from 'react';
import { Alert, Modal, ScrollView, View } from 'react-native';

import { NButton } from '@/components/forms/NButton';
import { NDate } from '@/components/forms/NDate';
import { NSelect } from '@/components/forms/NSelect';
import { NSwitch } from '@/components/forms/NSwitch';
import { NText } from '@/components/forms/NText';
import { NTextarea } from '@/components/forms/NTextarea';
import { Text } from '@/components/ui/text';
import type {
  FarmSupplyOption,
  Option,
  TargetOption,
} from '@/components/operationsagr/TechnicalVisitApplicationModal';
import { VisitSectionHeading } from '@/components/operationsagr/TechnicalVisitSections';
import type { TechnicalVisitSnapshotRow } from '@/lib/technical-visit-validation';

const parseNum = (value: string | number | null | undefined): number | null => {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

/* -------------------------------------------------------------------------- */
/* 1. Actividades culturales realizadas (TechnicalVisitFieldWork)             */
/* -------------------------------------------------------------------------- */

export type ActivityModalDraft = {
  TvaID: number;
  TvaActivityType: number | null;
  TvaStartDate: string;
  TvaEndDate: string;
  OwsID: number | null;
  TvaIrrigationSystem: number | null;
  TvaIrrigationType: number | null;
  TvaFuelType: number | null;
  TvaFlowRate: string;
  TvaFlowRateUnit: number | null;
  TvaDuration: string;
  TvaDurationUnit: number | null;
  TvaWaterVolume: string;
  TvaWaterVolumeUnit: number | null;
  TvaPrunedTreeCount: string;
  TvaWeedingType: number | null;
  TvaTrapType: number | null;
  TvaTrapCount: string;
  TvaObservation: string;
};

export function TechnicalVisitActivityModal({
  visible,
  onClose,
  row,
  options,
  waterSources,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  row: TechnicalVisitSnapshotRow | null;
  options: Record<string, Option[]>;
  waterSources: Option[];
  onSave: (payload: Record<string, unknown>) => void;
}) {
  const activities = options.OAG_VISIT_CULTURAL_ACTIVITY ?? [];
  const [draft, setDraft] = React.useState<ActivityModalDraft>({
    TvaID: 0,
    TvaActivityType: null,
    TvaStartDate: '',
    TvaEndDate: '',
    OwsID: null,
    TvaIrrigationSystem: null,
    TvaIrrigationType: null,
    TvaFuelType: null,
    TvaFlowRate: '',
    TvaFlowRateUnit: null,
    TvaDuration: '',
    TvaDurationUnit: null,
    TvaWaterVolume: '',
    TvaWaterVolumeUnit: null,
    TvaPrunedTreeCount: '',
    TvaWeedingType: null,
    TvaTrapType: null,
    TvaTrapCount: '',
    TvaObservation: '',
  });

  React.useEffect(() => {
    if (!visible) return;
    if (row) {
      setDraft({
        TvaID: Number(row.TvaID) || 0,
        TvaActivityType:
          row.TvaActivityType != null ? Number(row.TvaActivityType) : null,
        TvaStartDate: row.TvaStartDate ? String(row.TvaStartDate) : '',
        TvaEndDate: row.TvaEndDate ? String(row.TvaEndDate) : '',
        OwsID: row.OwsID != null ? Number(row.OwsID) : null,
        TvaIrrigationSystem:
          row.TvaIrrigationSystem != null
            ? Number(row.TvaIrrigationSystem)
            : null,
        TvaIrrigationType:
          row.TvaIrrigationType != null ? Number(row.TvaIrrigationType) : null,
        TvaFuelType: row.TvaFuelType != null ? Number(row.TvaFuelType) : null,
        TvaFlowRate: row.TvaFlowRate != null ? String(row.TvaFlowRate) : '',
        TvaFlowRateUnit:
          row.TvaFlowRateUnit != null ? Number(row.TvaFlowRateUnit) : null,
        TvaDuration: row.TvaDuration != null ? String(row.TvaDuration) : '',
        TvaDurationUnit:
          row.TvaDurationUnit != null ? Number(row.TvaDurationUnit) : null,
        TvaWaterVolume:
          row.TvaWaterVolume != null ? String(row.TvaWaterVolume) : '',
        TvaWaterVolumeUnit:
          row.TvaWaterVolumeUnit != null
            ? Number(row.TvaWaterVolumeUnit)
            : null,
        TvaPrunedTreeCount:
          row.TvaPrunedTreeCount != null ? String(row.TvaPrunedTreeCount) : '',
        TvaWeedingType:
          row.TvaWeedingType != null ? Number(row.TvaWeedingType) : null,
        TvaTrapType: row.TvaTrapType != null ? Number(row.TvaTrapType) : null,
        TvaTrapCount: row.TvaTrapCount != null ? String(row.TvaTrapCount) : '',
        TvaObservation: row.TvaObservation ? String(row.TvaObservation) : '',
      });
    } else {
      setDraft({
        TvaID: 0,
        TvaActivityType: null,
        TvaStartDate: '',
        TvaEndDate: '',
        OwsID: null,
        TvaIrrigationSystem: null,
        TvaIrrigationType: null,
        TvaFuelType: null,
        TvaFlowRate: '',
        TvaFlowRateUnit: null,
        TvaDuration: '',
        TvaDurationUnit: null,
        TvaWaterVolume: '',
        TvaWaterVolumeUnit: null,
        TvaPrunedTreeCount: '',
        TvaWeedingType: null,
        TvaTrapType: null,
        TvaTrapCount: '',
        TvaObservation: '',
      });
    }
  }, [visible, row]);

  const activityName =
    activities
      .find((item) => item.value === draft.TvaActivityType)
      ?.label.toLocaleLowerCase('es-PE') ?? '';
  const irrigation = draft.TvaActivityType === 1 || activityName.includes('riego');
  const pruning = draft.TvaActivityType === 2 || activityName.includes('poda');
  const weeding = draft.TvaActivityType === 3 || activityName.includes('deshierbo');
  const traps = draft.TvaActivityType === 4 || activityName.includes('trampas');

  const handleSave = () => {
    if (!draft.TvaActivityType) {
      Alert.alert('Revisa la actividad', 'Selecciona la actividad.');
      return;
    }
    const start = DateTime.fromISO(draft.TvaStartDate, { setZone: true });
    const end = DateTime.fromISO(draft.TvaEndDate, { setZone: true });
    if (!start.isValid || !end.isValid) {
      Alert.alert('Revisa la actividad', 'Completa las fechas de inicio y fin.');
      return;
    }
    if (end.startOf('day').toMillis() < start.startOf('day').toMillis()) {
      Alert.alert(
        'Revisa la actividad',
        'La fecha de fin debe ser igual o posterior al inicio.',
      );
      return;
    }

    const flowRate = parseNum(draft.TvaFlowRate);
    const duration = parseNum(draft.TvaDuration);
    const waterVolume = parseNum(draft.TvaWaterVolume);
    const prunedCount = parseNum(draft.TvaPrunedTreeCount);
    const trapCount = parseNum(draft.TvaTrapCount);

    if (
      (waterVolume != null) !== (draft.TvaWaterVolumeUnit != null) ||
      (flowRate != null) !== (draft.TvaFlowRateUnit != null) ||
      (duration != null) !== (draft.TvaDurationUnit != null)
    ) {
      Alert.alert(
        'Revisa la actividad',
        'Selecciona una unidad para cada medida registrada.',
      );
      return;
    }
    if (
      irrigation &&
      (!draft.OwsID || !draft.TvaIrrigationType || !draft.TvaIrrigationSystem)
    ) {
      Alert.alert(
        'Revisa la actividad',
        'Completa la fuente de agua y los datos del sistema de riego.',
      );
      return;
    }
    if (weeding && !draft.TvaWeedingType) {
      Alert.alert('Revisa la actividad', 'Selecciona el tipo de deshierbo.');
      return;
    }
    if (traps && !draft.TvaTrapType) {
      Alert.alert('Revisa la actividad', 'Selecciona el tipo de trampa.');
      return;
    }

    const activityTypeDescription =
      activities.find((item) => item.value === draft.TvaActivityType)?.label ??
      null;

    onSave({
      TvaID: draft.TvaID,
      TvaActivityType: draft.TvaActivityType,
      TvaActivityTypeDescription: activityTypeDescription,
      TvaStartDate: start.toUTC().toISO(),
      TvaEndDate: end.toUTC().toISO(),
      OwsID: irrigation ? draft.OwsID : null,
      TvaIrrigationSystem: irrigation ? draft.TvaIrrigationSystem : null,
      TvaIrrigationType: irrigation ? draft.TvaIrrigationType : null,
      TvaFuelType: irrigation ? draft.TvaFuelType : null,
      TvaFlowRate: irrigation ? flowRate : null,
      TvaFlowRateUnit: irrigation ? draft.TvaFlowRateUnit : null,
      TvaDuration: irrigation ? duration : null,
      TvaDurationUnit: irrigation ? draft.TvaDurationUnit : null,
      TvaWaterVolume: irrigation ? waterVolume : null,
      TvaWaterVolumeUnit: irrigation ? draft.TvaWaterVolumeUnit : null,
      TvaPrunedTreeCount: pruning ? prunedCount : null,
      TvaWeedingType: weeding ? draft.TvaWeedingType : null,
      TvaTrapType: traps ? draft.TvaTrapType : null,
      TvaTrapCount: traps ? trapCount : null,
      TvaObservation: draft.TvaObservation.trim() || null,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/60 px-4 py-6">
        <View className="max-h-[92%] w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <View className="flex-row items-center justify-between border-b border-border px-5 py-3.5">
            <Text className="text-base font-poppins-semibold text-foreground">
              {draft.TvaID
                ? 'Editar actividad realizada'
                : 'Nueva actividad realizada'}
            </Text>
            <NButton
              variant="ghost"
              size="icon"
              accessibilityLabel="Cerrar modal"
              onPress={onClose}
            >
              <X
                size={18}
                className="text-muted-foreground"
              />
            </NButton>
          </View>

          <ScrollView contentContainerClassName="gap-4 p-5">
            <VisitSectionHeading
              title="Actividad realizada"
              icon={ClipboardList}
            />

            <View className="flex-col gap-3 md:flex-row">
              <NSelect
                label="Actividad"
                items={activities}
                itemText="label"
                itemValue="value"
                value={draft.TvaActivityType}
                onChange={(val) =>
                  setDraft((prev) => ({
                    ...prev,
                    TvaActivityType: val != null ? Number(val) : null,
                    OwsID: null,
                    TvaIrrigationType: null,
                    TvaIrrigationSystem: null,
                    TvaFuelType: null,
                    TvaPrunedTreeCount: '',
                    TvaWeedingType: null,
                    TvaTrapType: null,
                    TvaTrapCount: '',
                    TvaWaterVolume: '',
                    TvaWaterVolumeUnit: null,
                    TvaFlowRate: '',
                    TvaFlowRateUnit: null,
                    TvaDuration: '',
                    TvaDurationUnit: null,
                  }))
                }
                placeholder="Seleccionar..."
                required
                containerClassName="flex-1"
              />
              <NDate
                label="Fecha de inicio"
                mode="date"
                value={draft.TvaStartDate}
                onChange={(val) =>
                  setDraft((prev) => ({ ...prev, TvaStartDate: val }))
                }
                required
                containerClassName="flex-1"
              />
              <NDate
                label="Fecha de fin"
                mode="date"
                value={draft.TvaEndDate}
                onChange={(val) =>
                  setDraft((prev) => ({ ...prev, TvaEndDate: val }))
                }
                required
                containerClassName="flex-1"
              />
            </View>

            {irrigation ? (
              <View className="gap-3">
                <View className="flex-col gap-3 md:flex-row">
                  <NSelect
                    label="Fuente de agua del lote"
                    items={waterSources}
                    itemText="label"
                    itemValue="value"
                    value={draft.OwsID}
                    onChange={(val) =>
                      setDraft((prev) => ({
                        ...prev,
                        OwsID: val != null ? Number(val) : null,
                      }))
                    }
                    placeholder="Seleccionar..."
                    required
                    disabled={waterSources.length === 0}
                    containerClassName="flex-1"
                  />
                  <NSelect
                    label="Sistema"
                    items={options.OAG_IRRIGATION_SYSTEM ?? []}
                    itemText="label"
                    itemValue="value"
                    value={draft.TvaIrrigationSystem}
                    onChange={(val) =>
                      setDraft((prev) => ({
                        ...prev,
                        TvaIrrigationSystem: val != null ? Number(val) : null,
                      }))
                    }
                    placeholder="Seleccionar..."
                    required
                    containerClassName="flex-1"
                  />
                  <NSelect
                    label="Tipo de sistema"
                    items={options.OAG_IRRIGATION_TYPE ?? []}
                    itemText="label"
                    itemValue="value"
                    value={draft.TvaIrrigationType}
                    onChange={(val) =>
                      setDraft((prev) => ({
                        ...prev,
                        TvaIrrigationType: val != null ? Number(val) : null,
                      }))
                    }
                    placeholder="Seleccionar..."
                    required
                    containerClassName="flex-1"
                  />
                </View>

                <View className="flex-col gap-3 md:flex-row">
                  <NSelect
                    label="Combustible"
                    items={options.OAG_FUEL_TYPE ?? []}
                    itemText="label"
                    itemValue="value"
                    value={draft.TvaFuelType}
                    onChange={(val) =>
                      setDraft((prev) => ({
                        ...prev,
                        TvaFuelType: val != null ? Number(val) : null,
                      }))
                    }
                    placeholder="Seleccionar..."
                    clearable
                    containerClassName="flex-1"
                  />
                  <NText
                    label="Caudal"
                    decimal
                    value={draft.TvaFlowRate}
                    onChange={(val) =>
                      setDraft((prev) => ({ ...prev, TvaFlowRate: val }))
                    }
                    containerClassName="flex-1"
                  />
                  <NSelect
                    label="Unidad de caudal"
                    items={options.OAG_WATER_FLOW_UNIT ?? []}
                    itemText="label"
                    itemValue="value"
                    value={draft.TvaFlowRateUnit}
                    onChange={(val) =>
                      setDraft((prev) => ({
                        ...prev,
                        TvaFlowRateUnit: val != null ? Number(val) : null,
                      }))
                    }
                    placeholder="Seleccionar..."
                    clearable
                    required={draft.TvaFlowRate.trim() !== ''}
                    containerClassName="flex-1"
                  />
                </View>

                <View className="flex-col gap-3 md:flex-row">
                  <NText
                    label="Duración"
                    decimal
                    value={draft.TvaDuration}
                    onChange={(val) =>
                      setDraft((prev) => ({ ...prev, TvaDuration: val }))
                    }
                    containerClassName="flex-1"
                  />
                  <NSelect
                    label="Unidad de duración"
                    items={options.OAG_DURATION_UNIT ?? []}
                    itemText="label"
                    itemValue="value"
                    value={draft.TvaDurationUnit}
                    onChange={(val) =>
                      setDraft((prev) => ({
                        ...prev,
                        TvaDurationUnit: val != null ? Number(val) : null,
                      }))
                    }
                    placeholder="Seleccionar..."
                    clearable
                    required={draft.TvaDuration.trim() !== ''}
                    containerClassName="flex-1"
                  />
                  <NText
                    label="Volumen de agua (opcional)"
                    decimal
                    value={draft.TvaWaterVolume}
                    onChange={(val) =>
                      setDraft((prev) => ({ ...prev, TvaWaterVolume: val }))
                    }
                    containerClassName="flex-1"
                  />
                </View>

                <View className="flex-col gap-3 md:flex-row">
                  <NSelect
                    label="Unidad de volumen"
                    items={options.OAG_WATER_VOLUME_UNIT ?? []}
                    itemText="label"
                    itemValue="value"
                    value={draft.TvaWaterVolumeUnit}
                    onChange={(val) =>
                      setDraft((prev) => ({
                        ...prev,
                        TvaWaterVolumeUnit: val != null ? Number(val) : null,
                      }))
                    }
                    placeholder="Seleccionar..."
                    clearable
                    required={draft.TvaWaterVolume.trim() !== ''}
                    containerClassName="flex-1 md:max-w-[32%]"
                  />
                </View>
              </View>
            ) : null}

            {pruning ? (
              <View className="flex-col gap-3 md:flex-row">
                <NText
                  label="Número de árboles podados"
                  number
                  value={draft.TvaPrunedTreeCount}
                  onChange={(val) =>
                    setDraft((prev) => ({ ...prev, TvaPrunedTreeCount: val }))
                  }
                  containerClassName="flex-1 md:max-w-[32%]"
                />
              </View>
            ) : null}

            {weeding ? (
              <View className="flex-col gap-3 md:flex-row">
                <NSelect
                  label="Tipo de deshierbo"
                  items={options.OAG_WEEDING_TYPE ?? []}
                  itemText="label"
                  itemValue="value"
                  value={draft.TvaWeedingType}
                  onChange={(val) =>
                    setDraft((prev) => ({
                      ...prev,
                      TvaWeedingType: val != null ? Number(val) : null,
                    }))
                  }
                  placeholder="Seleccionar..."
                  required
                  containerClassName="flex-1 md:max-w-[32%]"
                />
              </View>
            ) : null}

            {traps ? (
              <View className="flex-col gap-3 md:flex-row">
                <NSelect
                  label="Tipo de trampa"
                  items={options.OAG_TRAP_TYPE ?? []}
                  itemText="label"
                  itemValue="value"
                  value={draft.TvaTrapType}
                  onChange={(val) =>
                    setDraft((prev) => ({
                      ...prev,
                      TvaTrapType: val != null ? Number(val) : null,
                    }))
                  }
                  placeholder="Seleccionar..."
                  required
                  containerClassName="flex-1 md:max-w-[32%]"
                />
                <NText
                  label="Número de trampas"
                  number
                  value={draft.TvaTrapCount}
                  onChange={(val) =>
                    setDraft((prev) => ({ ...prev, TvaTrapCount: val }))
                  }
                  containerClassName="flex-1 md:max-w-[32%]"
                />
              </View>
            ) : null}

            <NTextarea
              label="Observación"
              value={draft.TvaObservation}
              onChange={(val) =>
                setDraft((prev) => ({ ...prev, TvaObservation: val }))
              }
            />
          </ScrollView>

          <View className="flex-row items-center justify-end gap-2 border-t border-border bg-card/40 px-5 py-3.5">
            <NButton
              variant="outline"
              onPress={onClose}
            >
              <Text>Cancelar</Text>
            </NButton>
            <NButton onPress={handleSave}>
              <Text>
                {draft.TvaID ? 'Guardar cambios' : 'Agregar actividad'}
              </Text>
            </NButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Recomendaciones (TechnicalVisitRecommendations)                         */
/* -------------------------------------------------------------------------- */

export type RecommendationModalDraft = {
  TvrID: number;
  TvrRecommendationType: number | null;
  TvrIsObservation: boolean;
  FrsID: number | null;
  FstID: number | null;
  TvrProductDescription: string;
  TvrObjective: string;
  TvrDose: string;
  TvrDoseUnit: number | null;
  TvrSortOrder: string;
  TvrInstruction: string;
};

export function TechnicalVisitRecommendationModal({
  visible,
  onClose,
  row,
  plotCropId,
  options,
  supplies,
  targets,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  row: TechnicalVisitSnapshotRow | null;
  plotCropId: number | null;
  options: Record<string, Option[]>;
  supplies: FarmSupplyOption[];
  targets: TargetOption[];
  onSave: (payload: Record<string, unknown>) => void;
}) {
  const recommendationTypes = options.OAG_RECOMMENDATION_TYPE ?? [];
  const doseUnits = options.OAG_DOSE_UNIT ?? [];

  const [draft, setDraft] = React.useState<RecommendationModalDraft>({
    TvrID: 0,
    TvrRecommendationType: null,
    TvrIsObservation: false,
    FrsID: null,
    FstID: null,
    TvrProductDescription: '',
    TvrObjective: '',
    TvrDose: '',
    TvrDoseUnit: null,
    TvrSortOrder: '1',
    TvrInstruction: '',
  });

  React.useEffect(() => {
    if (!visible) return;
    if (row) {
      setDraft({
        TvrID: Number(row.TvrID) || 0,
        TvrRecommendationType:
          row.TvrRecommendationType != null
            ? Number(row.TvrRecommendationType)
            : null,
        TvrIsObservation: row.FrsID == null,
        FrsID: row.FrsID != null ? Number(row.FrsID) : null,
        FstID: row.FstID != null ? Number(row.FstID) : null,
        TvrProductDescription: row.TvrProductDescription
          ? String(row.TvrProductDescription)
          : '',
        TvrObjective: row.TvrObjective ? String(row.TvrObjective) : '',
        TvrDose: row.TvrDose != null ? String(row.TvrDose) : '',
        TvrDoseUnit: row.TvrDoseUnit != null ? Number(row.TvrDoseUnit) : null,
        TvrSortOrder: String(
          Number(row.TvrSortOrder) > 0 ? row.TvrSortOrder : 1,
        ),
        TvrInstruction: row.TvrInstruction ? String(row.TvrInstruction) : '',
      });
    } else {
      setDraft({
        TvrID: 0,
        TvrRecommendationType: null,
        TvrIsObservation: false,
        FrsID: null,
        FstID: null,
        TvrProductDescription: '',
        TvrObjective: '',
        TvrDose: '',
        TvrDoseUnit: null,
        TvrSortOrder: '1',
        TvrInstruction: '',
      });
    }
  }, [visible, row]);

  const filteredTargets = React.useMemo(() => {
    if (!draft.FrsID) return [];
    return targets.filter(
      (target) =>
        target.FrsID === draft.FrsID &&
        (!plotCropId || target.CltID === plotCropId),
    );
  }, [draft.FrsID, targets, plotCropId]);

  const objectiveOptions = React.useMemo(
    () =>
      filteredTargets.map((target) => ({
        value: target.value,
        label: target.objectiveName ?? target.label,
      })),
    [filteredTargets],
  );

  // Auto-select target when supply has targets and none is selected yet
  React.useEffect(() => {
    if (
      !draft.TvrIsObservation &&
      draft.FrsID != null &&
      draft.FstID == null &&
      filteredTargets.length > 0
    ) {
      const first = filteredTargets[0];
      setDraft((prev) => ({
        ...prev,
        FstID: first.value,
        TvrObjective: first.objectiveName ?? first.label,
      }));
    }
  }, [draft.TvrIsObservation, draft.FrsID, draft.FstID, filteredTargets]);

  const selectedTarget = React.useMemo(
    () => filteredTargets.find((target) => target.value === draft.FstID) ?? null,
    [filteredTargets, draft.FstID],
  );

  const dose = parseNum(draft.TvrDose);
  const doseOutOfRange = Boolean(
    selectedTarget &&
      dose != null &&
      ((selectedTarget.FstMinDose != null && dose < selectedTarget.FstMinDose) ||
        (selectedTarget.FstMaxDose != null && dose > selectedTarget.FstMaxDose)),
  );

  const handleSave = () => {
    const sortOrder = Number(draft.TvrSortOrder);
    if (!draft.TvrRecommendationType) {
      Alert.alert(
        'Revisa la recomendación',
        'Selecciona el tipo de recomendación.',
      );
      return;
    }
    if (draft.TvrIsObservation && !draft.TvrProductDescription.trim()) {
      Alert.alert(
        'Revisa la recomendación',
        'Escribe el producto o la observación.',
      );
      return;
    }
    if (!draft.TvrIsObservation && !draft.FrsID) {
      Alert.alert('Revisa la recomendación', 'Selecciona un insumo.');
      return;
    }
    if (
      !draft.TvrIsObservation &&
      objectiveOptions.length > 0 &&
      !draft.FstID
    ) {
      Alert.alert(
        'Revisa la recomendación',
        'Selecciona el cultivo u objetivo.',
      );
      return;
    }
    if (draft.TvrIsObservation && !draft.TvrObjective.trim()) {
      Alert.alert(
        'Revisa la recomendación',
        'Completa el objetivo de la recomendación.',
      );
      return;
    }
    if (dose == null || dose <= 0) {
      Alert.alert(
        'Revisa la recomendación',
        'Indica una dosis mayor que cero.',
      );
      return;
    }
    if (!draft.TvrDoseUnit) {
      Alert.alert('Revisa la recomendación', 'Selecciona la unidad de dosis.');
      return;
    }
    if (!Number.isInteger(sortOrder) || sortOrder < 1) {
      Alert.alert(
        'Revisa la recomendación',
        'Indica un orden de aplicación válido.',
      );
      return;
    }

    const supply = supplies.find((item) => item.value === draft.FrsID);
    const supplyDescription =
      supply?.description ?? supply?.label.split(' - ')[0] ?? null;

    onSave({
      TvrID: draft.TvrID,
      TvrRecommendationType: draft.TvrRecommendationType,
      TvrRecommendationTypeDescription:
        recommendationTypes.find(
          (item) => item.value === draft.TvrRecommendationType,
        )?.label ?? null,
      FstID: draft.TvrIsObservation ? null : draft.FstID,
      FrsID: draft.TvrIsObservation ? null : draft.FrsID,
      FrsDescription: draft.TvrIsObservation ? null : supplyDescription,
      TvrProductDescription: draft.TvrIsObservation
        ? draft.TvrProductDescription.trim()
        : supplyDescription,
      TvrObjective: draft.TvrObjective.trim(),
      TvrDose: dose,
      TvrDoseUnit: draft.TvrDoseUnit,
      TvrDoseUnitDescription:
        doseUnits.find((item) => item.value === draft.TvrDoseUnit)?.label ??
        null,
      TvrSortOrder: sortOrder,
      TvrInstruction: draft.TvrInstruction.trim(),
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/60 px-4 py-6">
        <View className="max-h-[92%] w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <View className="flex-row items-center justify-between border-b border-border px-5 py-3.5">
            <Text className="text-base font-poppins-semibold text-foreground">
              {draft.TvrID ? 'Editar recomendación' : 'Nueva recomendación'}
            </Text>
            <NButton
              variant="ghost"
              size="icon"
              accessibilityLabel="Cerrar modal"
              onPress={onClose}
            >
              <X
                size={18}
                className="text-muted-foreground"
              />
            </NButton>
          </View>

          <ScrollView contentContainerClassName="gap-4 p-5">
            <View className="gap-4 rounded-xl border border-border/60 bg-card/30 p-4">
              <VisitSectionHeading
                title="Insumo y objetivo"
                subtitle="Define qué producto se recomienda, para qué y cómo debe aplicarlo el productor."
                icon={Sprout}
              />

              <View className="flex-row items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5">
                <View className="min-w-0 flex-1">
                  <Text className="text-xs font-poppins-semibold text-foreground">
                    Modo observación
                  </Text>
                  <Text className="text-[11px] text-muted-foreground">
                    Usa texto libre cuando el insumo o su objetivo no aparecen
                    en el catálogo.
                  </Text>
                </View>
                <NSwitch
                  value={draft.TvrIsObservation}
                  onValueChange={(checked) =>
                    setDraft((prev) => ({
                      ...prev,
                      TvrIsObservation: checked,
                      FrsID: null,
                      FstID: null,
                      TvrProductDescription: '',
                      TvrObjective: '',
                    }))
                  }
                />
              </View>

              <View className="flex-col gap-3 md:flex-row">
                <NSelect
                  label="Tipo de recomendación"
                  items={recommendationTypes}
                  itemText="label"
                  itemValue="value"
                  value={draft.TvrRecommendationType}
                  onChange={(val) =>
                    setDraft((prev) => ({
                      ...prev,
                      TvrRecommendationType: val != null ? Number(val) : null,
                    }))
                  }
                  placeholder="Seleccionar..."
                  required
                  containerClassName="flex-1"
                />
                {draft.TvrIsObservation ? (
                  <NTextarea
                    label="Producto / observación"
                    value={draft.TvrProductDescription}
                    onChange={(val) =>
                      setDraft((prev) => ({
                        ...prev,
                        TvrProductDescription: val,
                      }))
                    }
                    required
                    containerClassName="flex-1"
                  />
                ) : (
                  <NSelect
                    label="Insumo"
                    items={supplies}
                    itemText="label"
                    itemValue="value"
                    value={draft.FrsID}
                    onChange={(val) => {
                      const nextFrsId = val != null ? Number(val) : null;
                      const matching = nextFrsId
                        ? targets.filter(
                            (t) =>
                              t.FrsID === nextFrsId &&
                              (!plotCropId || t.CltID === plotCropId),
                          )
                        : [];
                      const firstTarget = matching[0] ?? null;
                      setDraft((prev) => ({
                        ...prev,
                        FrsID: nextFrsId,
                        FstID: firstTarget ? firstTarget.value : null,
                        TvrObjective: firstTarget
                          ? (firstTarget.objectiveName ?? firstTarget.label)
                          : '',
                      }));
                    }}
                    searchable
                    placeholder="Selecciona un insumo"
                    searchPlaceholder="Busca por nombre o ingrediente activo"
                    required
                    containerClassName="flex-1"
                  />
                )}
              </View>

              <View className="flex-col gap-3 md:flex-row">
                {draft.TvrIsObservation ? (
                  <NTextarea
                    label="Objetivo"
                    value={draft.TvrObjective}
                    onChange={(val) =>
                      setDraft((prev) => ({ ...prev, TvrObjective: val }))
                    }
                    placeholder="Ej. Mejorar el crecimiento y llenado del fruto"
                    required
                    containerClassName="flex-1"
                  />
                ) : (
                  <NSelect
                    label="Cultivo / objetivo"
                    items={objectiveOptions}
                    itemText="label"
                    itemValue="value"
                    value={draft.FstID}
                    onChange={(val) => {
                      const targetId = val != null ? Number(val) : null;
                      const found = objectiveOptions.find(
                        (item) => item.value === targetId,
                      );
                      setDraft((prev) => ({
                        ...prev,
                        FstID: targetId,
                        TvrObjective: found?.label ?? '',
                      }));
                    }}
                    disabled={!draft.FrsID || objectiveOptions.length === 0}
                    placeholder="Selecciona el objetivo del cultivo"
                    required
                    containerClassName="flex-1"
                  />
                )}
                <NText
                  label="Dosis"
                  decimal
                  value={draft.TvrDose}
                  onChange={(val) =>
                    setDraft((prev) => ({ ...prev, TvrDose: val }))
                  }
                  required
                  containerClassName="flex-1"
                />
              </View>

              <View className="flex-col gap-3 md:flex-row">
                <NSelect
                  label="Unidad de dosis"
                  items={doseUnits}
                  itemText="label"
                  itemValue="value"
                  value={draft.TvrDoseUnit}
                  onChange={(val) =>
                    setDraft((prev) => ({
                      ...prev,
                      TvrDoseUnit: val != null ? Number(val) : null,
                    }))
                  }
                  placeholder="Seleccionar..."
                  required
                  containerClassName="flex-1"
                />
                <NText
                  label="Orden de aplicación"
                  number
                  value={draft.TvrSortOrder}
                  onChange={(val) =>
                    setDraft((prev) => ({ ...prev, TvrSortOrder: val }))
                  }
                  required
                  containerClassName="flex-1"
                />
              </View>

              <NTextarea
                label="Indicaciones para el productor"
                value={draft.TvrInstruction}
                onChange={(val) =>
                  setDraft((prev) => ({ ...prev, TvrInstruction: val }))
                }
              />

              {selectedTarget?.FstMinDose != null ||
              selectedTarget?.FstMaxDose != null ? (
                <Text
                  className={
                    doseOutOfRange
                      ? 'text-xs text-destructive'
                      : 'text-xs text-muted-foreground'
                  }
                >
                  Rango configurado para el cultivo:{' '}
                  {selectedTarget.FstMinDose ?? '—'}–
                  {selectedTarget.FstMaxDose ?? '—'}
                  {doseOutOfRange
                    ? ' · La dosis ingresada está fuera de rango.'
                    : ''}
                </Text>
              ) : null}
            </View>
          </ScrollView>

          <View className="flex-row items-center justify-end gap-2 border-t border-border bg-card/40 px-5 py-3.5">
            <NButton
              variant="outline"
              onPress={onClose}
            >
              <Text>Cancelar</Text>
            </NButton>
            <NButton onPress={handleSave}>
              <Text>Guardar recomendación</Text>
            </NButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Actividades culturales sugeridas (TechnicalVisitCulturalActivities)     */
/* -------------------------------------------------------------------------- */

export function TechnicalVisitCulturalActivityModal({
  visible,
  onClose,
  row,
  options,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  row: TechnicalVisitSnapshotRow | null;
  options: Record<string, Option[]>;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  const activities = options.OAG_VISIT_CULTURAL_ACTIVITY ?? [];
  const [activityType, setActivityType] = React.useState<number | null>(null);
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [observation, setObservation] = React.useState('');

  React.useEffect(() => {
    if (!visible) return;
    if (row) {
      setActivityType(
        row.TcaActivityType != null ? Number(row.TcaActivityType) : null,
      );
      setStartDate(row.TcaStartDate ? String(row.TcaStartDate) : '');
      setEndDate(row.TcaEndDate ? String(row.TcaEndDate) : '');
      setObservation(row.TcaObservation ? String(row.TcaObservation) : '');
    } else {
      setActivityType(null);
      setStartDate('');
      setEndDate('');
      setObservation('');
    }
  }, [visible, row]);

  const handleSave = () => {
    if (!activityType) {
      Alert.alert(
        'Revisa la actividad cultural',
        'Selecciona la actividad cultural.',
      );
      return;
    }
    if (Boolean(startDate.trim()) !== Boolean(endDate.trim())) {
      Alert.alert(
        'Revisa la actividad cultural',
        'Completa ambas fechas o deja las dos vacías.',
      );
      return;
    }
    const parsedStart = startDate.trim()
      ? DateTime.fromISO(startDate.trim(), { setZone: true })
      : null;
    const parsedEnd = endDate.trim()
      ? DateTime.fromISO(endDate.trim(), { setZone: true })
      : null;
    if (
      parsedStart?.isValid &&
      parsedEnd?.isValid &&
      parsedEnd.startOf('day').toMillis() <
        parsedStart.startOf('day').toMillis()
    ) {
      Alert.alert(
        'Revisa la actividad cultural',
        'La fecha de fin debe ser posterior o igual a la fecha de inicio.',
      );
      return;
    }

    const description =
      activities.find((item) => item.value === activityType)?.label ?? null;

    onSave({
      TcaID: row ? Number(row.TcaID) || 0 : 0,
      TcaActivityType: activityType,
      TcaActivityTypeDescription: description,
      TcaIsCompleted: row ? Boolean(row.TcaIsCompleted) : false,
      TcaStartDate: parsedStart?.isValid ? parsedStart.toUTC().toISO() : null,
      TcaEndDate: parsedEnd?.isValid ? parsedEnd.toUTC().toISO() : null,
      TcaObservation: observation.trim() || null,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/60 px-4 py-6">
        <View className="max-h-[92%] w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <View className="flex-row items-center justify-between border-b border-border px-5 py-3.5">
            <Text className="text-base font-poppins-semibold text-foreground">
              {row ? 'Editar actividad cultural' : 'Nueva actividad cultural'}
            </Text>
            <NButton
              variant="ghost"
              size="icon"
              accessibilityLabel="Cerrar modal"
              onPress={onClose}
            >
              <X
                size={18}
                className="text-muted-foreground"
              />
            </NButton>
          </View>

          <ScrollView contentContainerClassName="gap-4 p-5">
            <NSelect
              label="Actividad cultural"
              items={activities}
              itemText="label"
              itemValue="value"
              value={activityType}
              onChange={(val) =>
                setActivityType(val != null ? Number(val) : null)
              }
              placeholder="Seleccionar..."
              required
            />

            <View className="flex-col gap-3 md:flex-row">
              <NDate
                label="Fecha de inicio"
                mode="date"
                value={startDate}
                onChange={setStartDate}
                containerClassName="flex-1"
              />
              <NDate
                label="Fecha de fin"
                mode="date"
                value={endDate}
                onChange={setEndDate}
                containerClassName="flex-1"
              />
            </View>

            <NTextarea
              label="Observación e indicaciones al productor"
              value={observation}
              onChange={setObservation}
            />
          </ScrollView>

          <View className="flex-row items-center justify-end gap-2 border-t border-border bg-card/40 px-5 py-3.5">
            <NButton
              variant="outline"
              onPress={onClose}
            >
              <Text>Cancelar</Text>
            </NButton>
            <NButton onPress={handleSave}>
              <Text>{row ? 'Guardar cambios' : 'Agregar actividad'}</Text>
            </NButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Evidencias (TechnicalVisitEvidenceSection)                              */
/* -------------------------------------------------------------------------- */

export function TechnicalVisitEvidenceModal({
  visible,
  onClose,
  row,
  onPickFile,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  row: TechnicalVisitSnapshotRow | null;
  onPickFile: () => Promise<{
    uri: string;
    name: string;
    mimeType?: string | null;
  } | null>;
  onSave: (payload: {
    TveID: number;
    TveFilID: number;
    TveDescription: string | null;
    PendingFile?: {
      uri: string;
      name: string;
      mimeType?: string | null;
    } | null;
  }) => void;
}) {
  const [description, setDescription] = React.useState('');
  const [pendingFile, setPendingFile] = React.useState<{
    uri: string;
    name: string;
    mimeType?: string | null;
  } | null>(null);

  React.useEffect(() => {
    if (!visible) return;
    if (row) {
      setDescription(row.TveDescription ? String(row.TveDescription) : '');
      const existingPending = row.PendingFile as
        | { uri: string; name: string; mimeType?: string | null }
        | undefined;
      setPendingFile(existingPending ?? null);
    } else {
      setDescription('');
      setPendingFile(null);
    }
  }, [visible, row]);

  const existingFileId = row ? Number(row.TveFilID) || 0 : 0;

  const handleSave = () => {
    if (!pendingFile && existingFileId <= 0) {
      Alert.alert(
        'Revisa la evidencia',
        'Adjunta un archivo para guardar la evidencia.',
      );
      return;
    }
    onSave({
      TveID: row ? Number(row.TveID) || 0 : 0,
      TveFilID: existingFileId,
      TveDescription: description.trim() || null,
      PendingFile: pendingFile,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/60 px-4 py-6">
        <View className="max-h-[92%] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <View className="flex-row items-center justify-between border-b border-border px-5 py-3.5">
            <Text className="text-base font-poppins-semibold text-foreground">
              {row ? 'Editar evidencia' : 'Agregar evidencia'}
            </Text>
            <NButton
              variant="ghost"
              size="icon"
              accessibilityLabel="Cerrar modal"
              onPress={onClose}
            >
              <X
                size={18}
                className="text-muted-foreground"
              />
            </NButton>
          </View>

          <ScrollView contentContainerClassName="gap-4 p-5">
            <VisitSectionHeading
              title="Evidencia fotográfica"
              subtitle="Adjunta fotos o documentos que respalden la visita"
              icon={ClipboardCheck}
            />

            <View className="gap-2">
              <Text className="text-[11px] font-poppins-medium text-foreground/90">
                Foto o documento
              </Text>
              <View className="flex-row flex-wrap items-center gap-3">
                <NButton
                  variant="outline"
                  onPress={async () => {
                    const picked = await onPickFile();
                    if (picked) {
                      setPendingFile(picked);
                      if (!description.trim()) {
                        setDescription(picked.name);
                      }
                    }
                  }}
                >
                  <ImagePlus
                    size={15}
                    className="text-foreground"
                  />
                  <Text>
                    {pendingFile || existingFileId > 0
                      ? 'Reemplazar archivo'
                      : 'Seleccionar archivo'}
                  </Text>
                </NButton>
                {pendingFile ? (
                  <Text className="text-xs text-muted-foreground">
                    {pendingFile.name}
                  </Text>
                ) : existingFileId > 0 ? (
                  <Text className="text-xs text-muted-foreground">
                    Archivo #{existingFileId}
                  </Text>
                ) : (
                  <Text className="text-xs text-muted-foreground">
                    Ningún archivo seleccionado
                  </Text>
                )}
              </View>
            </View>

            <NTextarea
              label="Descripción"
              value={description}
              onChange={setDescription}
            />
          </ScrollView>

          <View className="flex-row items-center justify-end gap-2 border-t border-border bg-card/40 px-5 py-3.5">
            <NButton
              variant="outline"
              onPress={onClose}
            >
              <Text>Cancelar</Text>
            </NButton>
            <NButton onPress={handleSave}>
              <Text>Agregar al borrador</Text>
            </NButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

