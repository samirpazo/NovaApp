import { Q } from '@nozbe/watermelondb';
import { randomUUID } from 'expo-crypto';
import { useFocusEffect, useRouter } from 'expo-router';
import { CalendarDays, Eye } from 'lucide-react-native';
import * as React from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { useAuthStore } from '@/auth/store';
import { NCrud, type NCrudColumn, type NCrudRow } from '@/components/crud';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { SYNC_RESOURCES } from '@/contracts/sync';
import {
  database,
  OagTechnicalVisitModel,
  OagTechnicalVisitScheduleModel,
} from '@/database';
import { DateTime } from 'luxon';
import { formatters } from '@/lib/formatter';
import { useSyncState } from '@/sync/state';
import { scheduledTechnicalVisit } from '@/lib/technical-visit-validation';

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
};

interface TechnicalVisitScheduleRow extends NCrudRow {
  TvsID: number;
  TvsScheduledDate: string;
  ResponsibleName: string | null;
  ProducerName: string | null;
  FrfName: string | null;
  PlfID: number;
  PlfName: string | null;
  CmpName: string | null;
  TvsObservation: string | null;
  VisitStatus: string;
  VisitDocument: string;
}

const columns: NCrudColumn<TechnicalVisitScheduleRow>[] = [
  { key: 'TvsID', title: 'ID', width: 64, align: 'right' },
  { key: 'TvsScheduledDate', title: 'Fecha', width: 120, format: (row) => formatters.date(DateTime.fromISO(row.TvsScheduledDate, { setZone: true })) },
  { key: 'ResponsibleName', title: 'Supervisor', width: 190, flex: 1 },
  { key: 'ProducerName', title: 'Productor', width: 190, flex: 1 },
  { key: 'FrfName', title: 'Fundo', width: 150, flex: 1 },
  { key: 'PlfID', title: 'ID lote', width: 84, align: 'right' },
  { key: 'PlfName', title: 'Lote', width: 150, flex: 1 },
  { key: 'CmpName', title: 'Campaña', width: 150, flex: 1 },
  { key: 'VisitDocument', title: 'Documento', width: 110 },
  {
    key: 'VisitStatus', title: 'Estado visita', width: 120, align: 'center',
    format: (row) => <Text className={row.VisitStatus === 'Registrado'
      ? 'rounded-full border border-success/50 bg-success/20 px-2 py-0.5 text-[10px] font-poppins-semibold uppercase tracking-wide text-success'
      : 'rounded-full border border-warning/50 bg-warning/20 px-2 py-0.5 text-[10px] font-poppins-semibold uppercase tracking-wide text-warning'}>{row.VisitStatus}</Text>,
  },
];

export default function TechnicalVisitsScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.Session?.User);
  const [schedules, setSchedules] = React.useState<OagTechnicalVisitScheduleModel[]>([]);
  const [visits, setVisits] = React.useState<OagTechnicalVisitModel[]>([]);

  const refresh = React.useCallback(async () => {
    const personId = user?.PrsID ?? 0;
    const [scheduleRows, visitRows] = await Promise.all([
      personId > 0
        ? database.get<OagTechnicalVisitScheduleModel>(SYNC_RESOURCES.OagTechnicalVisitSchedule)
            .query(Q.where('SecStatus', true), Q.where('TvsResponsiblePrsID', personId), Q.sortBy('TvsID', Q.asc))
            .fetch()
        : Promise.resolve([]),
      database.get<OagTechnicalVisitModel>(SYNC_RESOURCES.OagTechnicalVisit)
        .query(Q.where('SecStatus', true))
        .fetch(),
    ]);
    setSchedules(scheduleRows);
    setVisits(visitRows);
  }, [user?.PrsID]);

  useFocusEffect(React.useCallback(() => { void refresh(); }, [refresh]));
  const syncFinishedAt = useSyncState((state) => state.LastPull?.FinishedAt);
  React.useEffect(() => { void refresh(); }, [refresh, syncFinishedAt]);

  const opening = React.useRef(false);
  const startVisit = async (schedule: OagTechnicalVisitScheduleModel) => {
    if (opening.current) return;
    opening.current = true;
    try {
      const localVisits = await database.get<OagTechnicalVisitModel>(SYNC_RESOURCES.OagTechnicalVisit)
        .query(Q.where('SecStatus', true), Q.where('TvsID', schedule.TvsID)).fetch();
      const expectedVisitId = schedule.TviID;
      const existing = scheduledTechnicalVisit(schedule, localVisits);
      if (existing) {
        router.push({ pathname: '/technical-visit-detail', params: { id: existing.id } });
        return;
      }
      if (expectedVisitId != null && expectedVisitId > 0) {
        Alert.alert('Visita pendiente de descargar', 'Esta programación ya tiene una visita registrada. Sincroniza para descargarla antes de abrirla.');
        return;
      }
      const syncId = randomUUID();
      const temporaryId = -Math.floor(Date.now());
      const now = DateTime.utc().toISO() ?? '';
      const ownerId = user?.UsrID ?? 0;
      const snapshot: VisitSnapshot = {
        Visit: {
          SyncId: syncId, SyncVersion: '', SecStatus: true,
          CreateUserId: ownerId, UpdateUserId: ownerId, DeleteUserId: null,
          CreateDate: now, UpdateDate: now, DeleteDate: null,
          TviID: temporaryId, TvsID: schedule.TvsID,
          TviPerformedDate: now, TviDocumentSeries: null,
          TviDocumentNumber: null, TviLatitude: null, TviLongitude: null,
          TviObservation: null, TviSignatureFilID: null,
        },
        Applications: [], ApplicationDetails: [], Diagnoses: [], Phenology: [],
        Activities: [], Installations: [], Recommendations: [],
        PreviousRecommendations: [], RecommendationFollowUps: [],
        CulturalActivities: [], PreviousCulturalActivities: [],
        CulturalActivityFollowUps: [], Evidences: [],
      };
      await database.write(() => database.get<OagTechnicalVisitModel>(SYNC_RESOURCES.OagTechnicalVisit).create((record) => {
        record._raw.id = syncId;
        record.SyncId = syncId;
        record.SyncVersion = '';
        record.SecStatus = true;
        record.CreateUserId = ownerId;
        record.UpdateUserId = ownerId;
        record.DeleteUserId = null;
        record.CreateDate = now;
        record.UpdateDate = now;
        record.DeleteDate = null;
        record.TviID = temporaryId;
        record.TvsID = schedule.TvsID;
        record.TviPerformedDate = now;
        record.TviDocumentSeries = null;
        record.TviDocumentNumber = null;
        record.TviLatitude = null;
        record.TviLongitude = null;
        record.TviObservation = null;
        record.TviSignatureFilID = null;
        record.Snapshot = JSON.stringify(snapshot);
      }));
      await refresh();
      router.push({ pathname: '/technical-visit-detail', params: { id: syncId } });
    } catch {
      Alert.alert('No se pudo abrir la visita', 'Revisa la sincronización y vuelve a intentarlo.');
    } finally {
      opening.current = false;
    }
  };

  const hasPending = visits.some((visit) => visit.syncStatus !== 'synced');
  const rows: TechnicalVisitScheduleRow[] = schedules.map((schedule) => {
    const visit = scheduledTechnicalVisit(schedule, visits);
    return {
      id: schedule.id,
      syncStatus: schedule.syncStatus,
      TvsID: schedule.TvsID,
      TvsScheduledDate: schedule.TvsScheduledDate,
      ResponsibleName: schedule.ResponsibleName,
      ProducerName: schedule.ProducerName,
      FrfName: schedule.FrfName,
      PlfID: schedule.PlfID,
      PlfName: schedule.PlfName,
      CmpName: schedule.CmpName,
      TvsObservation: schedule.TvsObservation,
      VisitStatus: visit ? (visit.TviID > 0 ? 'Registrado' : 'Borrador local')
        : schedule.TviID != null && schedule.TviID > 0 ? 'Pendiente de descargar' : 'Sin registrar',
      VisitDocument: visit?.TviDocumentNumber != null
        ? `${visit.TviDocumentSeries ?? '1'}-${visit.TviDocumentNumber}` : '—',
    };
  });

  const visitColumns: NCrudColumn<TechnicalVisitScheduleRow>[] = [...columns, {
    key: 'id', title: 'Visita técnica', width: 110, sortable: false, exportable: false,
    format: (row) => <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir visita de programación ${row.TvsID}: ${row.PlfName ?? 'lote'}`}
      className="rounded-md border border-primary/40 bg-primary/15 p-2"
      onPress={(event) => {
        event.stopPropagation();
        const schedule = schedules.find((item) => item.id === row.id);
        if (schedule) void startVisit(schedule);
      }}
    ><Eye size={18} className="text-primary" /></Pressable>,
  }];

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-4 py-4">
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-green-100 dark:bg-green-950">
          <CalendarDays size={21} color="#15803d" />
        </View>
        <View className="flex-1">
          <Text className="text-xl font-poppins-semibold">Visitas técnicas</Text>
          <Text className="text-sm text-muted-foreground">Programaciones y borradores disponibles en este dispositivo</Text>
        </View>
      </View>
      {hasPending ? <Text className="text-xs text-warning">Hay visitas pendientes de sincronizar.</Text> : null}
      {schedules.length === 0 ? (
        <Card className="items-center gap-2 p-6">
          <Text className="font-poppins-semibold">No hay programaciones descargadas</Text>
          <Text className="text-center text-sm text-muted-foreground">Conéctate y sincroniza para cargar las programaciones asignadas a tu usuario.</Text>
        </Card>
      ) : <NCrud
        title="Programación de visitas técnicas"
        offline={{ resource: SYNC_RESOURCES.OagTechnicalVisitSchedule }}
        rows={rows}
        columns={visitColumns}
        searchPlaceholder="Buscar por lote, productor o supervisor"
        searchText={(row) => [row.TvsID, row.TvsObservation, row.ResponsibleName, row.ProducerName, row.FrfName, row.PlfID, row.PlfName, row.CmpName].join(' ')}
        selectionMode="single"

      />}
      <Pressable accessibilityRole="button" onPress={() => void refresh()} className="items-center py-2">
        <Text className="text-sm text-muted-foreground">Actualizar lista local</Text>
      </Pressable>
    </ScrollView>
  );
}
