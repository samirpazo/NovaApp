import { DateTime } from 'luxon';
import {
  FlaskConical,
  PackageCheck,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react-native';
import * as React from 'react';
import { Alert, Modal, Pressable, ScrollView, View } from 'react-native';

import { NButton } from '@/components/forms/NButton';
import { NDate } from '@/components/forms/NDate';
import { NSelect } from '@/components/forms/NSelect';
import { NSelectDefinition } from '@/components/forms/NSelectDefinition';
import { NSwitch } from '@/components/forms/NSwitch';
import { NText } from '@/components/forms/NText';
import { NTextarea } from '@/components/forms/NTextarea';
import { Text } from '@/components/ui/text';
import { formatters } from '@/lib/formatter';
import { PortalHost } from '@rn-primitives/portal';

export type Option = { label: string; value: number };

export type FarmSupplyOption = {
  value: number;
  label: string;
  description?: string;
};

export type TargetOption = {
  value: number;
  label: string;
  FrsID: number;
  CltID: number;
  ObjID: number;
  FstMinDose?: number | null;
  FstMaxDose?: number | null;
  objectiveName?: string;
};

export type ApplicationHeaderDraft = {
  TapID: number;
  TapApplicationMode: number | null;
  TapStartDateTime: string;
  TapEndDateTime: string;
  TapWaterLiters: string;
  TapFuelExpense: string;
  TapAppliedHectares: string;
  TapAppliedPlants: string;
  TapGeneralObservation: string;
};

export type ApplicationDetailDraft = {
  TadID: number;
  TapID?: number;
  TadFrsID: number | null;
  TadFstID: number | null;
  TadIsObservation: boolean;
  TadProductDescription: string;
  TadApplicationType: number | null;
  TadDose: string;
  TadDoseUnit: number | null;
  TadQuantity: string;
  TadQuantityUnit: number | null;
  TadObservation: string;
  SecStatus?: boolean;
};

interface TechnicalVisitApplicationModalProps {
  visible: boolean;
  onClose: () => void;
  application: Record<string, unknown> | null;
  existingDetails: Record<string, unknown>[];
  plotHectares: number | null;
  plotCropId: number | null;
  options: {
    OAG_FIELD_APPLICATION_MODE?: Option[];
    OAG_APPLICATION_TYPE?: Option[];
    OAG_DOSE_UNIT?: Option[];
    OAG_APPLICATION_QUANTITY_UNIT?: Option[];
  };
  supplies: FarmSupplyOption[];
  targets: TargetOption[];
  onSave: (
    header: ApplicationHeaderDraft,
    details: ApplicationDetailDraft[],
  ) => void;
}

const numericValue = (value: string | number | null | undefined): number | null => {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

export function TechnicalVisitApplicationModal({
  visible,
  onClose,
  application,
  existingDetails,
  plotHectares,
  plotCropId,
  options,
  supplies,
  targets,
  onSave,
}: TechnicalVisitApplicationModalProps) {
  const modeCatalog = options.OAG_FIELD_APPLICATION_MODE ?? [];
  const applicationTypes = options.OAG_APPLICATION_TYPE ?? [];
  const doseUnits = options.OAG_DOSE_UNIT ?? [];
  const quantityUnits = options.OAG_APPLICATION_QUANTITY_UNIT ?? [];

  const [header, setHeader] = React.useState<ApplicationHeaderDraft>({
    TapID: 0,
    TapApplicationMode: null,
    TapStartDateTime: '',
    TapEndDateTime: '',
    TapWaterLiters: '',
    TapFuelExpense: '',
    TapAppliedHectares: '',
    TapAppliedPlants: '',
    TapGeneralObservation: '',
  });

  const [details, setDetails] = React.useState<ApplicationDetailDraft[]>([]);
  const [detailForm, setDetailForm] =
    React.useState<ApplicationDetailDraft | null>(null);
  const [observationMode, setObservationMode] = React.useState(false);
  const [editingDetailIndex, setEditingDetailIndex] = React.useState<
    number | null
  >(null);

  // Initialize or reset form on open / application change
  React.useEffect(() => {
    if (!visible) return;

    if (application) {
      const startAt = application.TapStartDateTime
        ? DateTime.fromISO(String(application.TapStartDateTime), {
            setZone: true,
          }).toLocal().toISO() ?? ''
        : '';
      const endAt = application.TapEndDateTime
        ? DateTime.fromISO(String(application.TapEndDateTime), {
            setZone: true,
          }).toLocal().toISO() ?? ''
        : '';

      setHeader({
        TapID: Number(application.TapID) || 0,
        TapApplicationMode:
          application.TapApplicationMode != null
            ? Number(application.TapApplicationMode)
            : (modeCatalog[0]?.value ?? null),
        TapStartDateTime: startAt,
        TapEndDateTime: endAt,
        TapWaterLiters:
          application.TapWaterLiters != null
            ? String(application.TapWaterLiters)
            : '',
        TapFuelExpense:
          application.TapFuelExpense != null
            ? String(application.TapFuelExpense)
            : '',
        TapAppliedHectares:
          application.TapAppliedHectares != null
            ? String(application.TapAppliedHectares)
            : plotHectares != null
              ? String(plotHectares)
              : '',
        TapAppliedPlants:
          application.TapAppliedPlants != null
            ? String(application.TapAppliedPlants)
            : '',
        TapGeneralObservation: String(
          application.TapGeneralObservation ?? '',
        ),
      });

      setDetails(
        existingDetails
          .filter((item) => item.SecStatus !== false)
          .map((detail) => ({
            TadID: Number(detail.TadID) || 0,
            TapID: Number(detail.TapID) || Number(application.TapID) || 0,
            TadFrsID:
              detail.TadFrsID != null ? Number(detail.TadFrsID) : null,
            TadFstID:
              detail.TadFstID != null ? Number(detail.TadFstID) : null,
            TadIsObservation: Boolean(detail.TadIsObservation),
            TadProductDescription: String(
              detail.TadProductDescription ?? '',
            ),
            TadApplicationType:
              detail.TadApplicationType != null
                ? Number(detail.TadApplicationType)
                : null,
            TadDose:
              detail.TadDose != null ? String(detail.TadDose) : '',
            TadDoseUnit:
              detail.TadDoseUnit != null ? Number(detail.TadDoseUnit) : null,
            TadQuantity:
              detail.TadQuantity != null ? String(detail.TadQuantity) : '',
            TadQuantityUnit:
              detail.TadQuantityUnit != null
                ? Number(detail.TadQuantityUnit)
                : null,
            TadObservation: String(detail.TadObservation ?? ''),
          })),
      );
    } else {
      const now = DateTime.local();
      setHeader({
        TapID: 0,
        TapApplicationMode: modeCatalog[0]?.value ?? null,
        TapStartDateTime:
          now.set({ hour: 8, minute: 0, second: 0, millisecond: 0 }).toISO() ??
          '',
        TapEndDateTime:
          now
            .set({ hour: 17, minute: 0, second: 0, millisecond: 0 })
            .toISO() ?? '',
        TapWaterLiters: '',
        TapFuelExpense: '',
        TapAppliedHectares: plotHectares != null ? String(plotHectares) : '',
        TapAppliedPlants: '',
        TapGeneralObservation: '',
      });
      setDetails([]);
    }

    setDetailForm(null);
    setObservationMode(false);
    setEditingDetailIndex(null);
  }, [visible, application, existingDetails, plotHectares]);

  // Target options filtered by selected supply and plot crop
  const selectedSupplyId = detailForm?.TadFrsID ?? 0;
  const filteredTargets = React.useMemo(() => {
    if (!selectedSupplyId) return [];
    return targets.filter(
      (target) =>
        target.FrsID === selectedSupplyId &&
        (!plotCropId || target.CltID === plotCropId),
    );
  }, [selectedSupplyId, targets, plotCropId]);

  const targetSelectItems = React.useMemo(() => {
    return filteredTargets.map((target) => {
      const doseRange = [target.FstMinDose, target.FstMaxDose]
        .filter((d) => d != null)
        .join('–');
      return {
        value: target.value,
        label: `${target.objectiveName ?? 'Objetivo'} · dosis ${doseRange || 'sin rango'}`,
      };
    });
  }, [filteredTargets]);

  const selectedTarget = React.useMemo(() => {
    if (!detailForm?.TadFstID) return null;
    return filteredTargets.find((t) => t.value === detailForm.TadFstID) ?? null;
  }, [detailForm?.TadFstID, filteredTargets]);

  const targetDoseRangeText = React.useMemo(() => {
    if (!selectedTarget) return null;
    if (selectedTarget.FstMinDose == null && selectedTarget.FstMaxDose == null)
      return null;
    const min = selectedTarget.FstMinDose ?? '—';
    const max = selectedTarget.FstMaxDose ?? '—';
    return `Rango configurado para el cultivo: ${min}–${max}`;
  }, [selectedTarget]);

  // Auto-select first matching target when targets load or change
  React.useEffect(() => {
    if (
      detailForm &&
      !observationMode &&
      detailForm.TadFrsID != null &&
      detailForm.TadFstID == null &&
      filteredTargets.length > 0
    ) {
      const autoTarget = filteredTargets[0];
      setDetailForm((prev) => {
        if (!prev || prev.TadFstID != null) return prev;
        return {
          ...prev,
          TadFstID: autoTarget.value,
          TadDose:
            !prev.TadDose && autoTarget.FstMinDose != null
              ? String(autoTarget.FstMinDose)
              : prev.TadDose,
        };
      });
    }
  }, [
    detailForm?.TadFrsID,
    detailForm?.TadFstID,
    filteredTargets,
    observationMode,
  ]);

  // Handle open new detail subform
  const openNewDetail = () => {
    setObservationMode(false);
    setDetailForm({
      TadID: 0,
      TadFrsID: null,
      TadFstID: null,
      TadIsObservation: false,
      TadProductDescription: '',
      TadApplicationType: applicationTypes[0]?.value ?? null,
      TadDose: '',
      TadDoseUnit: doseUnits[0]?.value ?? null,
      TadQuantity: '',
      TadQuantityUnit: quantityUnits[0]?.value ?? null,
      TadObservation: '',
    });
    setEditingDetailIndex(null);
  };

  const openEditDetail = (index: number) => {
    const detail = details[index];
    if (!detail) return;
    setObservationMode(detail.TadIsObservation);
    setDetailForm({ ...detail });
    setEditingDetailIndex(index);
  };

  const removeDetail = (index: number) => {
    setDetails((current) => current.filter((_, i) => i !== index));
    if (editingDetailIndex === index) {
      setDetailForm(null);
      setEditingDetailIndex(null);
    }
  };

  const saveDetailSubform = () => {
    if (!detailForm) return;

    const dose = numericValue(detailForm.TadDose);
    const quantity = numericValue(detailForm.TadQuantity);
    const applicationType =
      detailForm.TadApplicationType ?? applicationTypes[0]?.value;
    const doseUnit = detailForm.TadDoseUnit ?? doseUnits[0]?.value;
    const quantityUnit =
      detailForm.TadQuantityUnit ?? quantityUnits[0]?.value;

    const validProduct = observationMode
      ? detailForm.TadProductDescription.trim().length > 0
      : detailForm.TadFrsID != null &&
        (filteredTargets.length === 0 || detailForm.TadFstID != null);

    if (!validProduct) {
      Alert.alert(
        'Producto incompleto',
        observationMode
          ? 'Ingresa la descripción del producto u observación.'
          : 'Selecciona el insumo y su objetivo correspondiente.',
      );
      return;
    }

    if (
      applicationType == null ||
      doseUnit == null ||
      quantityUnit == null ||
      dose == null ||
      dose <= 0 ||
      quantity == null ||
      quantity <= 0
    ) {
      Alert.alert(
        'Datos del producto incompletos',
        'Completa el tipo de aplicación, dosis y cantidad mayores que cero con sus unidades.',
      );
      return;
    }

    let productDescription = detailForm.TadProductDescription.trim();
    if (!observationMode) {
      const supply = supplies.find((s) => s.value === detailForm.TadFrsID);
      productDescription = supply?.label ?? productDescription;
    }

    const row: ApplicationDetailDraft = {
      ...detailForm,
      TadIsObservation: observationMode,
      TadProductDescription: productDescription,
      TadApplicationType: applicationType,
      TadDoseUnit: doseUnit,
      TadQuantityUnit: quantityUnit,
      TadDose: String(dose),
      TadQuantity: String(quantity),
      TadObservation: detailForm.TadObservation.trim(),
    };

    setDetails((current) => {
      if (editingDetailIndex == null) return [...current, row];
      return current.map((item, index) =>
        index === editingDetailIndex ? row : item,
      );
    });

    setDetailForm(null);
    setEditingDetailIndex(null);
  };

  // Submit complete application
  const handleSaveApplication = () => {
    if (!header.TapApplicationMode) {
      Alert.alert('Datos requeridos', 'Selecciona la modalidad de aplicación.');
      return;
    }

    const startAt = DateTime.fromISO(header.TapStartDateTime, { setZone: true });
    const endAt = DateTime.fromISO(header.TapEndDateTime, { setZone: true });

    if (!startAt.isValid || !endAt.isValid) {
      Alert.alert(
        'Fechas requeridas',
        'Completa la fecha y hora de inicio y fin de la aplicación.',
      );
      return;
    }

    if (endAt.toMillis() < startAt.toMillis()) {
      Alert.alert(
        'Rango de fechas inválido',
        'La fecha y hora de fin deben ser posteriores o iguales al inicio.',
      );
      return;
    }

    if (details.length === 0) {
      Alert.alert(
        'Detalle de insumos requerido',
        'Agrega al menos un producto aplicado a esta labor.',
      );
      return;
    }

    onSave(header, details);
  };

  const getDedDescription = (catalog: Option[], value: number | null | undefined) => {
    if (value == null) return '';
    return catalog.find((item) => item.value === value)?.label ?? '';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/70 px-3 py-5 sm:px-6">
        <View
          nativeID="modal-select-portal-host"
          className="max-h-[92vh] w-full max-w-4xl rounded-2xl border border-border bg-card shadow-2xl"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-border/80 px-5 py-4">
            <View className="flex-row items-center gap-2.5">
              <View className="rounded-lg bg-primary/10 p-2">
                <FlaskConical size={20} className="text-primary" />
              </View>
              <Text className="text-lg font-poppins-semibold text-foreground">
                {header.TapID ? 'Editar aplicación' : 'Nueva aplicación'}
              </Text>
            </View>
            <NButton
              variant="ghost"
              size="icon"
              accessibilityLabel="Cerrar modal"
              onPress={onClose}
            >
              <X size={20} className="text-muted-foreground" />
            </NButton>
          </View>

          <ScrollView
            className="flex-1 px-5 py-4"
            contentContainerClassName="gap-6 pb-6"
            keyboardShouldPersistTaps="handled"
          >
            {/* SECCIÓN 1: DATOS GENERALES */}
            <View className="gap-4 rounded-xl border border-border/70 bg-card p-4">
              <View className="gap-1 border-b border-border/50 pb-3">
                <Text className="text-sm font-poppins-semibold uppercase tracking-wider text-primary">
                  Datos generales
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Registra una labor de aplicación; debajo puedes agregar varios insumos.
                </Text>
              </View>

              {/* Subgrupo 1: Modalidad y Periodo */}
              <View className="gap-3">
                <Text className="text-xs font-poppins-medium uppercase tracking-wider text-muted-foreground">
                  Modalidad y periodo
                </Text>
                <View className="gap-3 sm:flex-row">
                  <View className="flex-1">
                    <NSelectDefinition
                      label="Modalidad de aplicación"
                      defCode="OAG_FIELD_APPLICATION_MODE"
                      value={header.TapApplicationMode}
                      onChange={(val) =>
                        setHeader((prev) => ({
                          ...prev,
                          TapApplicationMode: val != null ? Number(val) : null,
                        }))
                      }
                      placeholder="Selecciona modalidad"
                      required
                    />
                  </View>
                  <View className="flex-1">
                    <NDate
                      label="Inicio"
                      mode="datetime"
                      value={header.TapStartDateTime}
                      onChange={(val) =>
                        setHeader((prev) => ({ ...prev, TapStartDateTime: val }))
                      }
                      required
                    />
                  </View>
                  <View className="flex-1">
                    <NDate
                      label="Fin"
                      mode="datetime"
                      value={header.TapEndDateTime}
                      onChange={(val) =>
                        setHeader((prev) => ({ ...prev, TapEndDateTime: val }))
                      }
                      required
                    />
                  </View>
                </View>
              </View>

              {/* Subgrupo 2: Cobertura y Consumo */}
              <View className="gap-3 border-t border-border/50 pt-4">
                <Text className="text-xs font-poppins-medium uppercase tracking-wider text-muted-foreground">
                  Cobertura y consumo
                </Text>
                <View className="gap-3 sm:flex-row">
                  <View className="flex-1">
                    <NText
                      label="Hectáreas del lote"
                      value={plotHectares != null ? String(plotHectares) : '—'}
                      editable={false}
                      className="opacity-70"
                    />
                  </View>
                  <View className="flex-1">
                    <NText
                      label="Hectáreas aplicadas"
                      decimal
                      value={header.TapAppliedHectares}
                      onChange={(val) =>
                        setHeader((prev) => ({ ...prev, TapAppliedHectares: val }))
                      }
                      placeholder="Ej. 5.5"
                    />
                  </View>
                  <View className="flex-1">
                    <NText
                      label="Plantas aplicadas"
                      decimal
                      value={header.TapAppliedPlants}
                      onChange={(val) =>
                        setHeader((prev) => ({ ...prev, TapAppliedPlants: val }))
                      }
                      placeholder="Ej. 1200"
                    />
                  </View>
                </View>

                <View className="gap-3 sm:flex-row">
                  <View className="flex-1">
                    <NText
                      label="Agua utilizada (L)"
                      decimal
                      value={header.TapWaterLiters}
                      onChange={(val) =>
                        setHeader((prev) => ({ ...prev, TapWaterLiters: val }))
                      }
                      placeholder="Litros"
                    />
                  </View>
                  <View className="flex-1">
                    <NText
                      label="Gasto de combustible (Gal)"
                      decimal
                      value={header.TapFuelExpense}
                      onChange={(val) =>
                        setHeader((prev) => ({ ...prev, TapFuelExpense: val }))
                      }
                      placeholder="Galones"
                    />
                  </View>
                </View>
              </View>

              {/* Subgrupo 3: Observación General */}
              <View className="border-t border-border/50 pt-4">
                <NTextarea
                  label="Observación general"
                  numberOfLines={3}
                  value={header.TapGeneralObservation}
                  onChange={(val) =>
                    setHeader((prev) => ({ ...prev, TapGeneralObservation: val }))
                  }
                  placeholder="Observaciones de la aplicación en campo..."
                />
              </View>
            </View>

            {/* SECCIÓN 2: DETALLE DE INSUMOS */}
            <View className="gap-4 rounded-xl border border-border/70 bg-card p-4">
              <View className="flex-row items-center justify-between border-b border-border/50 pb-3">
                <View className="flex-1 gap-1">
                  <Text className="text-sm font-poppins-semibold uppercase tracking-wider text-primary">
                    Detalle de insumos
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Una labor puede incluir varios productos.
                  </Text>
                </View>
                <NButton
                  size="sm"
                  onPress={openNewDetail}
                  className="h-8 gap-1.5 px-3"
                >
                  <Plus size={16} className="text-primary-foreground" />
                  <Text className="text-xs font-poppins-medium text-primary-foreground">
                    Agregar detalle
                  </Text>
                </NButton>
              </View>

              {/* Lista de detalles agregados */}
              {details.length === 0 ? (
                <View className="items-center justify-center rounded-xl border border-dashed border-border/70 p-6">
                  <PackageCheck size={28} className="mb-2 text-muted-foreground" />
                  <Text className="text-center text-xs font-poppins text-muted-foreground">
                    Agrega al menos un producto aplicado.
                  </Text>
                </View>
              ) : (
                <View className="gap-2.5">
                  {details.map((detail, index) => {
                    const typeText = getDedDescription(
                      applicationTypes,
                      detail.TadApplicationType,
                    );
                    const doseUnitText = getDedDescription(
                      doseUnits,
                      detail.TadDoseUnit,
                    );
                    const qtyUnitText = getDedDescription(
                      quantityUnits,
                      detail.TadQuantityUnit,
                    );

                    return (
                      <View
                        key={`detail-${index}`}
                        className="flex-row items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 p-3.5"
                      >
                        <View className="min-w-0 flex-1 gap-1">
                          <View className="flex-row items-center gap-2">
                            {detail.TadIsObservation ? (
                              <View className="rounded bg-amber-500/10 px-2 py-0.5">
                                <Text className="text-[10px] font-poppins-semibold text-amber-500">
                                  Observación
                                </Text>
                              </View>
                            ) : null}
                            <Text
                              className="font-poppins-semibold text-sm text-foreground"
                              numberOfLines={1}
                            >
                              {detail.TadProductDescription || 'Sin descripción'}
                            </Text>
                          </View>

                          <Text className="text-xs text-muted-foreground">
                            {typeText || 'Tipo pendiente'} · Dosis {detail.TadDose}{' '}
                            {doseUnitText} · Cantidad {detail.TadQuantity}{' '}
                            {qtyUnitText}
                          </Text>

                          {detail.TadObservation ? (
                            <Text className="text-xs italic text-muted-foreground">
                              {detail.TadObservation}
                            </Text>
                          ) : null}
                        </View>

                        <View className="flex-row items-center gap-1.5">
                          <NButton
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            accessibilityLabel={`Editar detalle ${index + 1}`}
                            onPress={() => openEditDetail(index)}
                          >
                            <Pencil size={15} className="text-primary" />
                          </NButton>
                          <NButton
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            accessibilityLabel={`Eliminar detalle ${index + 1}`}
                            onPress={() => removeDetail(index)}
                          >
                            <Trash2 size={15} className="text-destructive-foreground" />
                          </NButton>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Subformulario de agregar / editar producto */}
              {detailForm ? (
                <View className="gap-4 rounded-xl border border-primary/40 bg-primary/5 p-4">
                  <View className="flex-row items-center justify-between border-b border-primary/20 pb-2">
                    <Text className="text-xs font-poppins-semibold uppercase tracking-wider text-primary">
                      {editingDetailIndex != null
                        ? 'Editar producto aplicado'
                        : 'Nuevo producto aplicado'}
                    </Text>
                    <Pressable onPress={() => setDetailForm(null)}>
                      <X size={16} className="text-muted-foreground" />
                    </Pressable>
                  </View>

                  {/* Switch Modo Observación */}
                  <View className="gap-1">
                    <NSwitch
                      label="Modo observación"
                      value={observationMode}
                      onValueChange={(checked) => {
                        setObservationMode(checked);
                        setDetailForm((prev) =>
                          prev
                            ? {
                                ...prev,
                                TadIsObservation: checked,
                                TadFrsID: null,
                                TadFstID: null,
                                TadProductDescription: '',
                              }
                            : null,
                        );
                      }}
                    />
                    <Text className="text-[11px] text-muted-foreground">
                      Usa texto libre cuando el producto aún no está regularizado en el maestro.
                    </Text>
                  </View>

                  {/* Insumo o Producto libre */}
                  {observationMode ? (
                    <NText
                      label="Producto / observación"
                      multiline
                      numberOfLines={2}
                      value={detailForm.TadProductDescription}
                      onChange={(val) =>
                        setDetailForm((prev) =>
                          prev ? { ...prev, TadProductDescription: val } : null,
                        )
                      }
                      placeholder="Nombre del insumo u observación..."
                      required
                    />
                  ) : (
                    <View className="gap-3 sm:flex-row">
                      <View className="flex-1">
                        <NSelect
                          label="Insumo"
                          items={supplies}
                          itemText="label"
                          itemValue="value"
                          value={detailForm.TadFrsID}
                          onChange={(val) => {
                            const supplyId = val != null ? Number(val) : null;
                            const supply = supplies.find(
                              (s) => s.value === supplyId,
                            );
                            const cropTargets = targets.filter(
                              (t) =>
                                t.FrsID === supplyId &&
                                (!plotCropId || t.CltID === plotCropId),
                            );
                            const allSupplyTargets = targets.filter(
                              (t) => t.FrsID === supplyId,
                            );
                            const autoTarget =
                              cropTargets.length > 0
                                ? cropTargets[0]
                                : allSupplyTargets[0] ?? null;

                            setDetailForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    TadFrsID: supplyId,
                                    TadProductDescription: supply?.label ?? '',
                                    TadFstID: autoTarget ? autoTarget.value : null,
                                    TadDose:
                                      !prev.TadDose && autoTarget?.FstMinDose != null
                                        ? String(autoTarget.FstMinDose)
                                        : prev.TadDose,
                                  }
                                : null,
                            );
                          }}
                          placeholder="Selecciona un insumo"
                          searchable
                          required
                        />
                      </View>
                      <View className="flex-1">
                        <NSelect
                          label="Cultivo / objetivo"
                          items={targetSelectItems}
                          itemText="label"
                          itemValue="value"
                          value={detailForm.TadFstID}
                          onChange={(val) => {
                            const targetId = val != null ? Number(val) : null;
                            const target = filteredTargets.find(
                              (t) => t.value === targetId,
                            );
                            setDetailForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    TadFstID: targetId,
                                    TadDose:
                                      !prev.TadDose && target?.FstMinDose != null
                                        ? String(target.FstMinDose)
                                        : prev.TadDose,
                                  }
                                : null,
                            );
                          }}
                          placeholder={
                            detailForm.TadFrsID
                              ? targetSelectItems.length
                                ? 'Selecciona objetivo'
                                : 'Sin objetivos configurados'
                              : 'Primero selecciona insumo'
                          }
                          disabled={!detailForm.TadFrsID || targetSelectItems.length === 0}
                        />
                        {targetDoseRangeText ? (
                          <Text className="mt-1 text-[11px] font-poppins text-primary">
                            {targetDoseRangeText}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  )}

                  {/* Tipo de aplicación, Dosis y Unidad */}
                  <View className="gap-3 sm:flex-row">
                    <View className="flex-1">
                      <NSelectDefinition
                        label="Tipo de aplicación"
                        defCode="OAG_APPLICATION_TYPE"
                        value={detailForm.TadApplicationType}
                        onChange={(val) =>
                          setDetailForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  TadApplicationType:
                                    val != null ? Number(val) : null,
                                }
                              : null,
                          )
                        }
                        placeholder="Tipo de aplicación"
                        required
                      />
                    </View>
                    <View className="flex-1">
                      <NText
                        label="Dosis"
                        decimal
                        value={detailForm.TadDose}
                        onChange={(val) =>
                          setDetailForm((prev) =>
                            prev ? { ...prev, TadDose: val } : null,
                          )
                        }
                        placeholder="Dosis"
                        required
                      />
                    </View>
                    <View className="flex-1">
                      <NSelectDefinition
                        label="Unidad de dosis"
                        defCode="OAG_DOSE_UNIT"
                        value={detailForm.TadDoseUnit}
                        onChange={(val) =>
                          setDetailForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  TadDoseUnit: val != null ? Number(val) : null,
                                }
                              : null,
                          )
                        }
                        placeholder="Unidad de dosis"
                        required
                      />
                    </View>
                  </View>

                  {/* Cantidad total y Unidad */}
                  <View className="gap-3 sm:flex-row">
                    <View className="flex-1">
                      <NText
                        label="Cantidad total"
                        decimal
                        value={detailForm.TadQuantity}
                        onChange={(val) =>
                          setDetailForm((prev) =>
                            prev ? { ...prev, TadQuantity: val } : null,
                          )
                        }
                        placeholder="Cantidad"
                        required
                      />
                    </View>
                    <View className="flex-1">
                      <NSelectDefinition
                        label="Unidad de cantidad"
                        defCode="OAG_APPLICATION_QUANTITY_UNIT"
                        value={detailForm.TadQuantityUnit}
                        onChange={(val) =>
                          setDetailForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  TadQuantityUnit:
                                    val != null ? Number(val) : null,
                                }
                              : null,
                          )
                        }
                        placeholder="Unidad de cantidad"
                        required
                      />
                    </View>
                  </View>

                  {/* Observación técnica */}
                  <NTextarea
                    label="Observación técnica"
                    numberOfLines={3}
                    value={detailForm.TadObservation}
                    onChange={(val) =>
                      setDetailForm((prev) =>
                        prev ? { ...prev, TadObservation: val } : null,
                      )
                    }
                    placeholder="Observaciones adicionales sobre este producto..."
                  />

                  {/* Botones del subformulario */}
                  <View className="flex-row justify-end gap-2.5 pt-2">
                    <NButton
                      variant="outline"
                      size="sm"
                      onPress={() => {
                        setDetailForm(null);
                        setEditingDetailIndex(null);
                      }}
                    >
                      <Text className="text-xs font-poppins-medium">Cancelar</Text>
                    </NButton>
                    <NButton
                      size="sm"
                      onPress={saveDetailSubform}
                    >
                      <Text className="text-xs font-poppins-semibold text-primary-foreground">
                        {editingDetailIndex != null
                          ? 'Actualizar detalle'
                          : 'Agregar a la aplicación'}
                      </Text>
                    </NButton>
                  </View>
                </View>
              ) : null}
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View className="flex-row items-center justify-end gap-3 border-t border-border/80 px-5 py-4">
            <NButton variant="outline" onPress={onClose}>
              <Text className="text-sm font-poppins-medium">Cancelar</Text>
            </NButton>
            <NButton onPress={handleSaveApplication}>
              <Text className="text-sm font-poppins-semibold text-primary-foreground">
                Guardar aplicación
              </Text>
            </NButton>
          </View>
          <PortalHost />
        </View>
      </View>
    </Modal>
  );
}
