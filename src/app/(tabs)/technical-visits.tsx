import { Q } from '@nozbe/watermelondb';
import { randomUUID } from 'expo-crypto';
import { useFocusEffect, useRouter } from 'expo-router';
import { CalendarDays, ClipboardPlus, WifiOff } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { useAuthStore } from '@/auth/store';
import { Button } from '@/components/ui/button';
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
            .query(Q.where('SecStatus', true), Q.where('TvsResponsiblePrsID', personId))
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

  const startVisit = async (schedule: OagTechnicalVisitScheduleModel) => {
    const existing = visits.find((visit) => visit.TvsID === schedule.TvsID);
    if (existing) {
      router.push({ pathname: '/technical-visit-detail', params: { id: existing.id } });
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
  };

  const hasPending = visits.some((visit) => visit.syncStatus !== 'synced');

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
      <Card className="flex-row items-center gap-3 p-4">
        <WifiOff size={19} color="#b45309" />
        <Text className="flex-1 text-sm">Las visitas se guardan aquí y se sincronizan cuando vuelvas a tener conexión.</Text>
      </Card>
      {hasPending ? <Text className="text-xs text-amber-700">Hay visitas pendientes de sincronizar.</Text> : null}
      {schedules.length === 0 ? (
        <Card className="items-center gap-2 p-6">
          <Text className="font-poppins-semibold">No hay programaciones descargadas</Text>
          <Text className="text-center text-sm text-muted-foreground">Conéctate y sincroniza para cargar las programaciones asignadas a tu usuario.</Text>
        </Card>
      ) : schedules.map((schedule) => {
        const visit = visits.find((item) => item.TvsID === schedule.TvsID);
        return (
          <Card key={schedule.id} className="gap-3 p-4">
            <View className="flex-row items-start gap-3">
              <View className="flex-1">
                <Text className="font-poppins-semibold">{schedule.PlfName || 'Lote ' + schedule.PlfID}</Text>
                <Text className="text-sm text-muted-foreground">Programada: {formatters.date(schedule.TvsScheduledDate)}</Text>
                {schedule.CmpName ? <Text className="text-xs text-muted-foreground">{schedule.CmpName}</Text> : null}
                {schedule.ProducerName ? <Text className="text-xs text-muted-foreground">{schedule.ProducerName}</Text> : null}
                {schedule.TvsObservation ? <Text className="mt-1 text-sm">{schedule.TvsObservation}</Text> : null}
              </View>
              <Text className="rounded-full bg-muted px-2 py-1 text-xs">{visit ? (visit.syncStatus === 'synced' ? 'Registrada' : 'Pendiente') : 'Pendiente'}</Text>
            </View>
            <Button variant="outline" onPress={() => void startVisit(schedule)}>
              <ClipboardPlus size={16} color="#166534" />
              <Text>{visit ? 'Continuar visita' : 'Iniciar visita'}</Text>
            </Button>
          </Card>
        );
      })}
      <Pressable accessibilityRole="button" onPress={() => void refresh()} className="items-center py-2">
        <Text className="text-sm text-muted-foreground">Actualizar desde este dispositivo</Text>
      </Pressable>
    </ScrollView>
  );
}
