import { useLocalSearchParams, useRouter } from 'expo-router';
import { DateTime } from 'luxon';
import * as React from 'react';
import { Alert, Modal, ScrollView, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

import { useAuthStore } from '@/auth/store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { NText } from '@/components/forms/NText';
import { NDate } from '@/components/forms/NDate';
import { Text } from '@/components/ui/text';
import { NSwitch } from '@/components/forms/NSwitch';
import { NSelect } from '@/components/forms/NSelect';
import { Q } from '@nozbe/watermelondb';
import { SYNC_RESOURCES } from '@/contracts/sync';
import { database, GenDefinitionDetailModel, GenDefinitionModel, OagTechnicalVisitModel } from '@/database';
import { randomUUID } from 'expo-crypto';

type VisitSnapshot = {
  Visit: Record<string, unknown>;
  Applications: unknown[];
  ApplicationDetails: unknown[];
  Diagnoses: unknown[];
  Phenology: unknown[];
  Activities: unknown[];
  Installations: unknown[];
  Recommendations: unknown[];
  PreviousRecommendations: unknown[];
  RecommendationFollowUps: unknown[];
  CulturalActivities: unknown[];
  PreviousCulturalActivities: unknown[];
  CulturalActivityFollowUps: unknown[];
  Evidences: unknown[];
  PendingSignatureFile?: { uri: string; name: string; mimeType?: string | null };
};

type SectionKey = Exclude<keyof VisitSnapshot, 'Visit' | 'PendingSignatureFile'>;
type SectionField = { key: string; label: string; kind?: 'number' | 'decimal' | 'boolean' | 'datetime'; required?: boolean; definitionCode?: string };
type SectionDefinition = { key: SectionKey; label: string; id: string; fields: SectionField[] };

const sections: { key: SectionKey; label: string }[] = [
  { key: 'Applications', label: 'Aplicaciones' },
  { key: 'ApplicationDetails', label: 'Productos aplicados' },
  { key: 'Diagnoses', label: 'Diagnósticos' },
  { key: 'Phenology', label: 'Fenología' },
  { key: 'Activities', label: 'Labores de campo' },
  { key: 'Installations', label: 'Instalaciones' },
  { key: 'Recommendations', label: 'Recomendaciones' },
  { key: 'RecommendationFollowUps', label: 'Seguimiento de recomendaciones' },
  { key: 'CulturalActivities', label: 'Actividades culturales' },
  { key: 'CulturalActivityFollowUps', label: 'Seguimiento cultural' },
  { key: 'Evidences', label: 'Evidencias' },
];

const editableSections: SectionDefinition[] = [
  { key: 'Applications', label: 'Aplicaciones', id: 'TapID', fields: [
    { key: 'TapApplicationMode', label: 'Modo de aplicación', kind: 'number', definitionCode: 'OAG_FIELD_APPLICATION_MODE' },
    { key: 'TapWaterLiters', label: 'Agua (litros)', kind: 'decimal' },
    { key: 'TapFuelExpense', label: 'Combustible', kind: 'decimal' },
    { key: 'TapAppliedHectares', label: 'Hectáreas aplicadas', kind: 'decimal' },
    { key: 'TapAppliedPlants', label: 'Plantas aplicadas', kind: 'decimal' },
    { key: 'TapGeneralObservation', label: 'Observación' },
  ] },
  { key: 'ApplicationDetails', label: 'Productos aplicados', id: 'TadID', fields: [
    { key: 'TapID', label: 'ID de aplicación', kind: 'number', required: true },
    { key: 'TadFrsID', label: 'ID de insumo', kind: 'number' },
    { key: 'TadFstID', label: 'ID de objetivo', kind: 'number' },
    { key: 'TadProductDescription', label: 'Producto o insumo', required: true },
    { key: 'TadApplicationType', label: 'Tipo de aplicación', kind: 'number', required: true, definitionCode: 'OAG_APPLICATION_TYPE' },
    { key: 'TadDose', label: 'Dosis', kind: 'decimal' },
    { key: 'TadDoseUnit', label: 'Unidad de dosis', kind: 'number', definitionCode: 'OAG_DOSE_UNIT' },
    { key: 'TadQuantity', label: 'Cantidad', kind: 'decimal' },
    { key: 'TadQuantityUnit', label: 'Unidad de cantidad', kind: 'number', definitionCode: 'OAG_APPLICATION_QUANTITY_UNIT' },
    { key: 'TadIsObservation', label: 'Es solo observación', kind: 'boolean' },
    { key: 'TadObservation', label: 'Observación' },
  ] },
  { key: 'Diagnoses', label: 'Diagnósticos', id: 'TvdID', fields: [
    { key: 'TvdCategory', label: 'Categoría', kind: 'number', required: true },
    { key: 'PlgID', label: 'ID de plaga', kind: 'number' },
    { key: 'FrsID', label: 'ID de insumo relacionado', kind: 'number' },
    { key: 'TvdPlantOrgan', label: 'Órgano de la planta', kind: 'number', definitionCode: 'OAG_PLANT_ORGAN' },
    { key: 'TvdIncidencePercentage', label: 'Incidencia (%)', kind: 'decimal' },
    { key: 'TvdItemDescription', label: 'Descripción del hallazgo' },
    { key: 'TvdObservation', label: 'Observación' },
  ] },
  { key: 'Phenology', label: 'Fenología', id: 'TphID', fields: [
    { key: 'TphStage', label: 'Etapa fenológica', kind: 'number', required: true, definitionCode: 'OAG_PHENOLOGICAL_STAGE' },
    { key: 'TphPercentage', label: 'Porcentaje (%)', kind: 'decimal', required: true },
  ] },
  { key: 'Activities', label: 'Labores de campo', id: 'TvaID', fields: [
    { key: 'TvaActivityType', label: 'Tipo de labor', kind: 'number', required: true, definitionCode: 'OAG_VISIT_CULTURAL_ACTIVITY' },
    { key: 'TvaIrrigationType', label: 'Tipo de riego', kind: 'number', definitionCode: 'OAG_IRRIGATION_TYPE' },
    { key: 'OwsID', label: 'ID de fuente de agua', kind: 'number' },
    { key: 'TvaIrrigationSystem', label: 'Sistema de riego', kind: 'number', definitionCode: 'OAG_IRRIGATION_SYSTEM' },
    { key: 'TvaFuelType', label: 'Tipo de combustible', kind: 'number', definitionCode: 'OAG_FUEL_TYPE' },
    { key: 'TvaPrunedTreeCount', label: 'Árboles podados', kind: 'number' },
    { key: 'TvaWeedingType', label: 'Tipo de deshierbo', kind: 'number', definitionCode: 'OAG_WEEDING_TYPE' },
    { key: 'TvaTrapType', label: 'Tipo de trampa', kind: 'number', definitionCode: 'OAG_TRAP_TYPE' },
    { key: 'TvaTrapCount', label: 'Cantidad de trampas', kind: 'number' },
    { key: 'TvaStartDate', label: 'Inicio', kind: 'datetime' },
    { key: 'TvaEndDate', label: 'Fin', kind: 'datetime' },
    { key: 'TvaWaterVolume', label: 'Volumen de agua', kind: 'decimal' },
    { key: 'TvaWaterVolumeUnit', label: 'Unidad de volumen', kind: 'number', definitionCode: 'OAG_WATER_VOLUME_UNIT' },
    { key: 'TvaFlowRate', label: 'Caudal', kind: 'decimal' },
    { key: 'TvaFlowRateUnit', label: 'Unidad de caudal', kind: 'number', definitionCode: 'OAG_WATER_FLOW_UNIT' },
    { key: 'TvaDuration', label: 'Duración', kind: 'decimal' },
    { key: 'TvaDurationUnit', label: 'Unidad de duración', kind: 'number', definitionCode: 'OAG_DURATION_UNIT' },
    { key: 'TvaObservation', label: 'Observación' },
  ] },
  { key: 'Installations', label: 'Instalaciones', id: 'TinID', fields: [
    { key: 'TinInstallationType', label: 'Tipo de instalación', kind: 'number', required: true },
    { key: 'TinIsAvailable', label: 'Disponible', kind: 'boolean' },
    { key: 'TinObservation', label: 'Observación' },
  ] },
  { key: 'Recommendations', label: 'Recomendaciones', id: 'TvrID', fields: [
    { key: 'TvrRecommendationType', label: 'Tipo de recomendación', kind: 'number', required: true, definitionCode: 'OAG_RECOMMENDATION_TYPE' },
    { key: 'TvrObjective', label: 'Objetivo' },
    { key: 'FstID', label: 'ID de objetivo de insumo', kind: 'number' },
    { key: 'FrsID', label: 'ID de insumo', kind: 'number' },
    { key: 'TvrProductDescription', label: 'Producto recomendado' },
    { key: 'TvrDose', label: 'Dosis', kind: 'decimal' },
    { key: 'TvrDoseUnit', label: 'Unidad de dosis', kind: 'number', definitionCode: 'OAG_DOSE_UNIT' },
    { key: 'TvrSortOrder', label: 'Orden', kind: 'number' },
    { key: 'TvrInstruction', label: 'Instrucción' },
  ] },
  { key: 'RecommendationFollowUps', label: 'Seguimiento de recomendaciones', id: 'TrfID', fields: [
    { key: 'TvrID', label: 'ID de recomendación', kind: 'number', required: true },
    { key: 'TrfStatus', label: 'Estado', kind: 'number', required: true, definitionCode: 'OAG_RECOMMENDATION_FOLLOW_UP_STATUS' },
    { key: 'TrfObservation', label: 'Observación' },
  ] },
  { key: 'CulturalActivities', label: 'Actividades culturales', id: 'TcaID', fields: [
    { key: 'TcaActivityType', label: 'Tipo de actividad', kind: 'number', required: true, definitionCode: 'OAG_VISIT_CULTURAL_ACTIVITY' },
    { key: 'TcaIsCompleted', label: 'Completada', kind: 'boolean' },
    { key: 'TcaStartDate', label: 'Inicio', kind: 'datetime' },
    { key: 'TcaEndDate', label: 'Fin', kind: 'datetime' },
    { key: 'TcaObservation', label: 'Observación' },
  ] },
  { key: 'CulturalActivityFollowUps', label: 'Seguimiento cultural', id: 'TcfID', fields: [
    { key: 'TcaID', label: 'ID de actividad cultural', kind: 'number', required: true },
    { key: 'TcfStatus', label: 'Estado', kind: 'number', required: true, definitionCode: 'OAG_RECOMMENDATION_FOLLOW_UP_STATUS' },
    { key: 'TcfObservation', label: 'Observación' },
  ] },
];

export default function TechnicalVisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const userId = useAuthStore((state) => state.Session?.User.UsrID ?? 0);
  const [model, setModel] = React.useState<OagTechnicalVisitModel | null>(null);
  const [snapshot, setSnapshot] = React.useState<VisitSnapshot | null>(null);
  const [date, setDate] = React.useState('');
  const [latitude, setLatitude] = React.useState('');
  const [longitude, setLongitude] = React.useState('');
  const [observation, setObservation] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState<SectionDefinition | null>(null);
  const [editingRow, setEditingRow] = React.useState<Record<string, unknown> | null>(null);
  const [sectionValues, setSectionValues] = React.useState<Record<string, string | boolean>>({});
  const [definitionOptions, setDefinitionOptions] = React.useState<Record<string, { label: string; value: number }[]>>({});

  React.useEffect(() => {
    void Promise.all([
      database.get<GenDefinitionModel>('GenDefinition').query(Q.where('SecStatus', true)).fetch(),
      database.get<GenDefinitionDetailModel>('GenDefinitionDetail').query(Q.where('SecStatus', true)).fetch(),
    ]).then(([definitions, details]) => {
      const codes = new Map(definitions.map((definition) => [definition.DefID, definition.DefCode]));
      const options: Record<string, { label: string; value: number }[]> = {};
      for (const detail of details) {
        const code = codes.get(detail.DefID);
        if (!code) continue;
        (options[code] ??= []).push({ label: detail.DedDescription, value: detail.DedValue });
      }
      setDefinitionOptions(options);
    }).catch(() => setDefinitionOptions({}));
  }, []);

  React.useEffect(() => {
    if (!id) return;
    void database.get<OagTechnicalVisitModel>(SYNC_RESOURCES.OagTechnicalVisit).find(id)
      .then((record) => {
        const parsed = JSON.parse(record.Snapshot) as VisitSnapshot;
        setModel(record);
        setSnapshot(parsed);
        setDate(String(parsed.Visit.TviPerformedDate ?? record.TviPerformedDate));
        setLatitude(parsed.Visit.TviLatitude == null ? '' : String(parsed.Visit.TviLatitude));
        setLongitude(parsed.Visit.TviLongitude == null ? '' : String(parsed.Visit.TviLongitude));
        setObservation(String(parsed.Visit.TviObservation ?? ''));
      })
      .catch(() => Alert.alert('Visita no disponible', 'No se encontró el borrador local.'));
  }, [id]);

  const save = async () => {
    if (!model || !snapshot) return;
    const parsedDate = DateTime.fromISO(date.trim(), { setZone: true });
    const lat = latitude.trim() ? Number(latitude) : null;
    const lon = longitude.trim() ? Number(longitude) : null;
    if (!parsedDate.isValid || (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) ||
      (lon !== null && (!Number.isFinite(lon) || lon < -180 || lon > 180))) {
      Alert.alert('Revisa los datos', 'La fecha y las coordenadas deben ser válidas.');
      return;
    }
    setSaving(true);
    try {
      const now = DateTime.utc().toISO() ?? '';
      const next: VisitSnapshot = {
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
      await database.write(() => model.update((record) => {
        record.TviPerformedDate = String(next.Visit.TviPerformedDate);
        record.TviLatitude = lat;
        record.TviLongitude = lon;
        record.TviObservation = observation.trim() || null;
        record.UpdateUserId = userId;
        record.UpdateDate = now;
        record.Snapshot = JSON.stringify(next);
      }));
      setSnapshot(next);
      Alert.alert('Guardado en el dispositivo', 'La visita se sincronizará al recuperar conexión.');
    } finally {
      setSaving(false);
    }
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

  const attachSignature = async () => {
    if (!model || !snapshot) return;
    const file = await chooseImage();
    if (!file) return;
    const next = { ...snapshot, PendingSignatureFile: file };
    await database.write(() => model.update((record) => {
      record.Snapshot = JSON.stringify(next);
      record.UpdateUserId = userId;
      record.UpdateDate = DateTime.utc().toISO() ?? '';
    }));
    setSnapshot(next);
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
    await database.write(() => model.update((record) => {
      record.Snapshot = JSON.stringify(next);
      record.UpdateUserId = ownerId;
      record.UpdateDate = now;
    }));
    setSnapshot(next);
  };

  const openSectionRow = (
    definition: SectionDefinition,
    row?: Record<string, unknown>,
  ) => {
    const initial = Object.fromEntries(definition.fields.map((field) => [
      field.key,
      field.kind === 'boolean'
        ? Boolean(row?.[field.key])
        : row?.[field.key] == null ? '' : String(row[field.key]),
    ])) as Record<string, string | boolean>;
    if (!row && definition.key === 'ApplicationDetails') {
      const first = snapshot?.Applications[0] as Record<string, unknown> | undefined;
      if (first?.TapID != null) initial.TapID = String(first.TapID);
    }
    if (!row && definition.key === 'RecommendationFollowUps') {
      const first = snapshot?.Recommendations[0] as Record<string, unknown> | undefined;
      if (first?.TvrID != null) initial.TvrID = String(first.TvrID);
    }
    if (!row && definition.key === 'CulturalActivityFollowUps') {
      const first = snapshot?.CulturalActivities[0] as Record<string, unknown> | undefined;
      if (first?.TcaID != null) initial.TcaID = String(first.TcaID);
    }
    setSectionValues(initial);
    setEditingRow(row ?? null);
    setActiveSection(definition);
  };

  const saveSectionRow = async () => {
    if (!model || !snapshot || !activeSection) return;
    const data: Record<string, unknown> = {};
    for (const field of activeSection.fields) {
      const value = sectionValues[field.key];
      if (field.required && (value === '' || value === undefined)) {
        Alert.alert('Completa los datos', 'El campo «' + field.label + '» es obligatorio.');
        return;
      }
      if (field.kind === 'boolean') {
        data[field.key] = Boolean(value);
      } else if (field.kind === 'number' || field.kind === 'decimal') {
        if (value === '' || value === undefined) data[field.key] = null;
        else {
          const number = Number(value);
          if (!Number.isFinite(number)) {
            Alert.alert('Dato inválido', 'Revisa el valor de «' + field.label + '».');
            return;
          }
          data[field.key] = number;
        }
      } else if (field.kind === 'datetime') {
        const parsed = value ? DateTime.fromISO(String(value), { setZone: true }) : null;
        if (field.required && !parsed?.isValid) {
          Alert.alert('Fecha inválida', 'Revisa «' + field.label + '».');
          return;
        }
        data[field.key] = parsed?.isValid ? parsed.toUTC().toISO() : null;
      } else {
        data[field.key] = typeof value === 'string' ? value.trim() || null : null;
      }
    }
    const now = DateTime.utc().toISO() ?? '';
    const rows = snapshot[activeSection.key] as Record<string, unknown>[];
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
    const nextRow = {
      ...base,
      ...data,
      [activeSection.id]: primaryId,
      TviID: model.TviID,
      UpdateUserId: userId,
      UpdateDate: now,
    };
    const next = {
      ...snapshot,
      [activeSection.key]: editingRow
        ? rows.map((row) => row === editingRow ? nextRow : row)
        : [...rows, nextRow],
    };
    await database.write(() => model.update((record) => {
      record.Snapshot = JSON.stringify(next);
      record.UpdateUserId = userId;
      record.UpdateDate = now;
    }));
    setSnapshot(next);
    setActiveSection(null);
    setEditingRow(null);
  };

  const removeSectionRow = async (
    definition: SectionDefinition,
    row: Record<string, unknown>,
  ) => {
    if (!model || !snapshot) return;
    const now = DateTime.utc().toISO() ?? '';
    const rows = snapshot[definition.key] as Record<string, unknown>[];
    const next = {
      ...snapshot,
      [definition.key]: rows.map((item) => item === row
        ? { ...item, SecStatus: false, DeleteUserId: userId, DeleteDate: now }
        : item),
    };
    await database.write(() => model.update((record) => {
      record.Snapshot = JSON.stringify(next);
      record.UpdateUserId = userId;
      record.UpdateDate = now;
    }));
    setSnapshot(next);
  };

  const toggleFollowUp = async (
    property: 'Recommendations' | 'CulturalActivities',
    followUpProperty: 'RecommendationFollowUps' | 'CulturalActivityFollowUps',
    followUpId: 'TvrID' | 'TcaID',
    statusProperty: 'TrfStatus' | 'TcfStatus',
  ) => {
    if (!model || !snapshot) return;
    const parent = snapshot[property][0] as Record<string, unknown> | undefined;
    if (!parent) return;
    const now = DateTime.utc().toISO() ?? '';
    const followUps = snapshot[followUpProperty] as Record<string, unknown>[];
    const current = followUps.find((row) => row[followUpId] === parent[followUpId]);
    const nextRow = current
      ? { ...current, [statusProperty]: current[statusProperty] === 1 ? 2 : 1, UpdateUserId: userId, UpdateDate: now }
      : {
          SyncId: randomUUID(), SyncVersion: '', SecStatus: true,
          CreateUserId: userId, UpdateUserId: userId, DeleteUserId: null,
          CreateDate: now, UpdateDate: now, DeleteDate: null,
          ...(followUpProperty === 'RecommendationFollowUps'
            ? { TrfID: -Math.floor(Date.now()) }
            : { TcfID: -Math.floor(Date.now()) }),
          TviID: model.TviID, [followUpId]: parent[followUpId],
          [statusProperty]: 1, TrfObservation: null, TcfObservation: null,
        };
    const next = {
      ...snapshot,
      [followUpProperty]: current
        ? followUps.map((row) => row === current ? nextRow : row)
        : [...followUps, nextRow],
    };
    await database.write(() => model.update((record) => {
      record.Snapshot = JSON.stringify(next);
      record.UpdateUserId = userId;
      record.UpdateDate = now;
    }));
    setSnapshot(next);
  };

  if (!model || !snapshot) return <View className="flex-1 items-center justify-center"><Text>Cargando visita guardada…</Text></View>;

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-4 py-4">
      <View className="flex-row items-center gap-3">
        <Button size="sm" variant="ghost" onPress={() => router.back()}><Text>Volver</Text></Button>
        <View className="flex-1">
          <Text className="text-xl font-poppins-semibold">Registro de visita</Text>
          <Text className="text-sm text-muted-foreground">Programación #{model.TvsID} · {model.TviDocumentNumber ? 'N.º ' + model.TviDocumentNumber : 'Número al sincronizar'}</Text>
        </View>
      </View>
      <Card className="gap-3 p-4">
        <Text className="font-poppins-semibold">Datos de campo</Text>
        <NDate label="Fecha y hora" mode="datetime" value={date} onChange={setDate} required />
        <View className="flex-row gap-2">
          <NText className="flex-1" label="Latitud" decimal value={latitude} onChange={setLatitude} placeholder="Latitud" />
          <NText className="flex-1" label="Longitud" decimal value={longitude} onChange={setLongitude} placeholder="Longitud" />
        </View>
        <NText multiline numberOfLines={4} className="min-h-24 py-2" label="Observación general" value={observation} onChange={setObservation} placeholder="Describe los hallazgos del recorrido" />
        <Button variant="outline" onPress={() => void attachSignature()}>
          <Text>{snapshot.PendingSignatureFile ? 'Cambiar firma del productor' : 'Adjuntar firma del productor'}</Text>
        </Button>
        <Button disabled={saving} onPress={() => void save()}><Text>{saving ? 'Guardando…' : 'Guardar borrador'}</Text></Button>
      </Card>
      <Text className="text-lg font-poppins-semibold">Secciones de la visita</Text>
      {sections.map(({ key, label }) => (
        <Card key={key} className="gap-3 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 font-poppins-medium">{label}</Text>
            <Text className="text-sm text-muted-foreground">{snapshot[key].length}</Text>
          </View>
          {key === 'Evidences' ? <Button variant="outline" onPress={() => void attachEvidence()}><Text>Adjuntar foto</Text></Button> : null}
          {editableSections.filter((item) => item.key === key).map((definition) => {
            const rows = snapshot[key] as Record<string, unknown>[];
            return (
              <View key={definition.key} className="gap-2">
                {rows.filter((row) => row.SecStatus !== false).map((row) => (
                  <View key={String(row.SyncId)} className="flex-row items-center gap-2 rounded-md bg-muted p-2">
                    <Text className="flex-1 text-xs" numberOfLines={2}>
                      {definition.fields.slice(0, 3).map((field) => {
                        const value = row[field.key];
                        return value == null || value === '' ? null : field.label + ': ' + String(value);
                      }).filter(Boolean).join(' · ') || 'Registro guardado'}
                    </Text>
                    <Button size="sm" variant="ghost" onPress={() => openSectionRow(definition, row)}><Text>Editar</Text></Button>
                    <Button size="sm" variant="ghost" onPress={() => void removeSectionRow(definition, row)}><Text>Quitar</Text></Button>
                  </View>
                ))}
                <Button variant="outline" onPress={() => openSectionRow(definition)}><Text>Agregar</Text></Button>
              </View>
            );
          })}
          {key === 'CulturalActivities' ? <NSwitch label="Seguimiento cultural confirmado" value={(snapshot.CulturalActivityFollowUps[0] as Record<string, unknown> | undefined)?.TcfStatus === 1} onValueChange={() => void toggleFollowUp('CulturalActivities', 'CulturalActivityFollowUps', 'TcaID', 'TcfStatus')} /> : null}
          {key === 'Recommendations' ? <NSwitch label="Seguimiento de recomendación confirmado" value={(snapshot.RecommendationFollowUps[0] as Record<string, unknown> | undefined)?.TrfStatus === 1} onValueChange={() => void toggleFollowUp('Recommendations', 'RecommendationFollowUps', 'TvrID', 'TrfStatus')} /> : null}
        </Card>
      ))}
      <Modal visible={activeSection !== null} animationType="slide" onRequestClose={() => setActiveSection(null)}>
        <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-4 px-4 py-6">
          <Text className="text-xl font-poppins-semibold">{editingRow ? 'Editar ' : 'Agregar '}{activeSection?.label}</Text>
          {activeSection?.fields.map((field) => field.definitionCode
            ? <NSelect key={field.key} label={field.label} items={definitionOptions[field.definitionCode] ?? []} itemText="label" itemValue="value" value={sectionValues[field.key] === '' ? null : Number(sectionValues[field.key])} onChange={(value) => setSectionValues((current) => ({ ...current, [field.key]: value == null ? '' : String(value) }))} placeholder="Selecciona una opción descargada" searchable clearable required={field.required} />
            : field.kind === 'boolean'
            ? <NSwitch key={field.key} label={field.label} value={Boolean(sectionValues[field.key])} onValueChange={(value) => setSectionValues((current) => ({ ...current, [field.key]: value }))} />
            : field.kind === 'datetime'
              ? <NDate key={field.key} label={field.label} mode="datetime" value={String(sectionValues[field.key] || '')} onChange={(value) => setSectionValues((current) => ({ ...current, [field.key]: value }))} />
              : <NText key={field.key} label={field.label} value={String(sectionValues[field.key] ?? '')} onChange={(value) => setSectionValues((current) => ({ ...current, [field.key]: value }))} number={field.kind === 'number'} decimal={field.kind === 'decimal'} required={field.required} />)}
          <Button onPress={() => void saveSectionRow()}><Text>Guardar sección</Text></Button>
          <Button variant="outline" onPress={() => setActiveSection(null)}><Text>Cancelar</Text></Button>
        </ScrollView>
      </Modal>
      <Card className="p-4">
        <Text className="text-sm text-muted-foreground">El borrador y sus secciones viajan juntos en una sola operación de sincronización. El número de documento se asigna en el servidor.</Text>
      </Card>
    </ScrollView>
  );
}
