import { Q } from '@nozbe/watermelondb';
import { randomUUID } from 'expo-crypto';
import { useFocusEffect, useRouter } from 'expo-router';
import { Eye } from 'lucide-react-native';
import * as React from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { useAuthStore } from '@/auth/store';
import { NCrud, type NCrudColumn, type NCrudRow } from '@/components/crud';
import { NDate, NSelect, NSelectDefinition, NText } from '@/components/forms';
import { Text } from '@/components/ui/text';
import { SYNC_RESOURCES } from '@/contracts/sync';
import {
  database,
  OagTechnicalVisitModel,
  OagTechnicalVisitScheduleModel,
  GenCampaignModel,
  OagFruitFarmModel,
  OagPlotFarmModel,
} from '@/database';
import { DateTime } from 'luxon';
import { formatters } from '@/lib/formatter';
import { useSyncState } from '@/sync/state';
import { scheduledTechnicalVisit } from '@/lib/technical-visit-validation';
import { createTechnicalVisitTemporaryId } from '@/sync/technical-visit-temp-ids';

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
  VisitStatus: 'Sin registrar' | 'Registrado';
}

type ScheduleDraft = {
  PlfID: number | null;
  CmpID: number | null;
  TvsScheduledDate: string;
  TvsObservation: string;
  TvsVisitType: number;
  id?: string;
};

const columns: NCrudColumn<TechnicalVisitScheduleRow>[] = [
  { key: 'TvsID', title: 'ID', width: 64, align: 'right' },
  {
    key: 'TvsScheduledDate',
    title: 'Fecha',
    width: 120,
    format: (row) =>
      formatters.date(
        DateTime.fromISO(row.TvsScheduledDate, { setZone: true }),
      ),
  },
  { key: 'ResponsibleName', title: 'Supervisor', width: 190, flex: 1 },
  { key: 'ProducerName', title: 'Productor', width: 190, flex: 1 },
  { key: 'FrfName', title: 'Fundo', width: 150, flex: 1 },
  { key: 'PlfID', title: 'ID lote', width: 84, align: 'right' },
  { key: 'PlfName', title: 'Lote', width: 150, flex: 1 },
  {
    key: 'VisitStatus',
    title: 'Estado visita',
    width: 120,
    align: 'center',
    format: (row) => (
      <Text
        className={
          row.VisitStatus === 'Registrado'
            ? 'rounded-full bg-success px-3 py-1 text-[10px] font-poppins-semibold text-white'
            : 'rounded-full bg-warning px-3 py-1 text-[10px] font-poppins-semibold text-zinc-950'
        }
      >
        {row.VisitStatus}
      </Text>
    ),
  },
];

export default function TechnicalVisitsScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.Session?.User);
  const [schedules, setSchedules] = React.useState<
    OagTechnicalVisitScheduleModel[]
  >([]);
  const [visits, setVisits] = React.useState<OagTechnicalVisitModel[]>([]);
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [visitStatus, setVisitStatus] = React.useState<
    'all' | 'pending' | 'registered'
  >('all');
  const [campaigns, setCampaigns] = React.useState<GenCampaignModel[]>([]);
  const [plots, setPlots] = React.useState<OagPlotFarmModel[]>([]);
  const [farms, setFarms] = React.useState<OagFruitFarmModel[]>([]);
  const [scheduleDraft, setScheduleDraft] =
    React.useState<ScheduleDraft | null>(null);

  const refresh = React.useCallback(async () => {
    const personId = user?.PrsID ?? 0;
    const [scheduleRows, visitRows, campaignRows, plotRows, farmRows] =
      await Promise.all([
        personId > 0
          ? database
              .get<OagTechnicalVisitScheduleModel>(
                SYNC_RESOURCES.OagTechnicalVisitSchedule,
              )
              .query(
                Q.where('SecStatus', true),
                Q.where('TvsResponsiblePrsID', personId),
                Q.sortBy('TvsID', Q.desc),
              )
              .fetch()
          : Promise.resolve([]),
        database
          .get<OagTechnicalVisitModel>(SYNC_RESOURCES.OagTechnicalVisit)
          .query(Q.where('SecStatus', true))
          .fetch(),
        database
          .get<GenCampaignModel>(SYNC_RESOURCES.GenCampaign)
          .query(Q.where('SecStatus', true), Q.sortBy('CmpName', Q.asc))
          .fetch(),
        database
          .get<OagPlotFarmModel>(SYNC_RESOURCES.OagPlotFarm)
          .query(Q.where('SecStatus', true), Q.sortBy('PlfName', Q.asc))
          .fetch(),
        database
          .get<OagFruitFarmModel>(SYNC_RESOURCES.OagFruitFarm)
          .query(Q.where('SecStatus', true))
          .fetch(),
      ]);
    setSchedules(scheduleRows);
    setVisits(visitRows);
    setCampaigns(campaignRows);
    setPlots(plotRows);
    setFarms(farmRows);
  }, [user?.PrsID]);

  useFocusEffect(
    React.useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  const syncFinishedAt = useSyncState((state) => state.LastPull?.FinishedAt);
  React.useEffect(() => {
    void refresh();
  }, [refresh, syncFinishedAt]);

  const opening = React.useRef(false);
  const startVisit = async (schedule: OagTechnicalVisitScheduleModel) => {
    if (opening.current) return;
    opening.current = true;
    try {
      const localVisits = await database
        .get<OagTechnicalVisitModel>(SYNC_RESOURCES.OagTechnicalVisit)
        .query(Q.where('SecStatus', true), Q.where('TvsID', schedule.TvsID))
        .fetch();
      const expectedVisitId = schedule.TviID;
      const existing = scheduledTechnicalVisit(schedule, localVisits);
      if (existing) {
        router.push({
          pathname: '/technical-visit-detail',
          params: { id: existing.id },
        });
        return;
      }
      if (expectedVisitId != null && expectedVisitId > 0) {
        Alert.alert(
          'Visita pendiente de descargar',
          'Esta programación ya tiene una visita registrada. Sincroniza para descargarla antes de abrirla.',
        );
        return;
      }
      const syncId = randomUUID();
      const temporaryId = createTechnicalVisitTemporaryId();
      const now = DateTime.utc().toISO() ?? '';
      const ownerId = user?.UsrID ?? 0;
      const snapshot: VisitSnapshot = {
        Visit: {
          SyncId: syncId,
          SyncVersion: '',
          SecStatus: true,
          CreateUserId: ownerId,
          UpdateUserId: ownerId,
          DeleteUserId: null,
          CreateDate: now,
          UpdateDate: now,
          DeleteDate: null,
          TviID: temporaryId,
          TvsID: schedule.TvsID,
          TviPerformedDate: now,
          TviDocumentSeries: null,
          TviDocumentNumber: null,
          TviLatitude: null,
          TviLongitude: null,
          TviObservation: null,
          TviSignatureFilID: null,
        },
        Applications: [],
        ApplicationDetails: [],
        Diagnoses: [],
        Phenology: [],
        Activities: [],
        Installations: [],
        Recommendations: [],
        PreviousRecommendations: [],
        RecommendationFollowUps: [],
        CulturalActivities: [],
        PreviousCulturalActivities: [],
        CulturalActivityFollowUps: [],
        Evidences: [],
      };
      await database.write(() =>
        database
          .get<OagTechnicalVisitModel>(SYNC_RESOURCES.OagTechnicalVisit)
          .create((record) => {
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
          }),
      );
      await refresh();
      router.push({
        pathname: '/technical-visit-detail',
        params: { id: syncId },
      });
    } catch {
      Alert.alert(
        'No se pudo abrir la visita',
        'Revisa la sincronización y vuelve a intentarlo.',
      );
    } finally {
      opening.current = false;
    }
  };

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
      VisitStatus:
        (visit?.TviID ?? schedule.TviID ?? 0) > 0
          ? 'Registrado'
          : 'Sin registrar',
    };
  });

  const visitColumns: NCrudColumn<TechnicalVisitScheduleRow>[] = [
    ...columns,
    {
      key: 'id',
      title: 'Visita técnica',
      width: 110,
      align: 'center',
      sortable: false,
      exportable: false,
      format: (row) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Abrir visita de programación ${row.TvsID}: ${row.PlfName ?? 'lote'}`}
          className="h-8 w-8 items-center justify-center rounded-md bg-secondary"
          onPress={(event) => {
            event.stopPropagation();
            const schedule = schedules.find((item) => item.id === row.id);
            if (schedule) void startVisit(schedule);
          }}
        >
          <Eye
            size={16}
            className="text-secondary-foreground"
          />
        </Pressable>
      ),
    },
  ];

  const campaignOptions = campaigns.map((campaign) => ({
    label: campaign.CmpName,
    value: campaign.CmpID,
  }));
  const plotOptions = plots.map((plot) => ({
    label: `${plot.PlfName} · ${farms.find((farm) => farm.FrfID === plot.FrfID)?.FrfName ?? 'Fundo'}`,
    value: plot.PlfID,
  }));
  const updateDraft = (value: Partial<ScheduleDraft>) =>
    setScheduleDraft((current) =>
      current ? { ...current, ...value } : current,
    );
  const openNewSchedule = () =>
    setScheduleDraft({
      PlfID: null,
      CmpID: null,
      TvsScheduledDate: DateTime.local().toISODate() ?? '',
      TvsObservation: '',
      TvsVisitType: 0,
    });
  const openSchedule = (row: TechnicalVisitScheduleRow) =>
    setScheduleDraft({
      id: row.id,
      PlfID: schedules.find((item) => item.id === row.id)?.PlfID ?? null,
      CmpID: schedules.find((item) => item.id === row.id)?.CmpID ?? null,
      TvsScheduledDate: row.TvsScheduledDate,
      TvsObservation: row.TvsObservation ?? '',
      TvsVisitType:
        schedules.find((item) => item.id === row.id)?.TvsVisitType ?? 0,
    });
  const saveSchedule = async () => {
    const personId = user?.PrsID ?? 0;
    if (
      !scheduleDraft?.PlfID ||
      !scheduleDraft.CmpID ||
      !scheduleDraft.TvsScheduledDate ||
      personId <= 0
    ) {
      Alert.alert(
        'Completa la programación',
        'Selecciona lote, campaña y fecha. Se requiere una cuenta vinculada a un supervisor.',
      );
      return false;
    }
    const plot = plots.find((item) => item.PlfID === scheduleDraft.PlfID);
    const campaign = campaigns.find(
      (item) => item.CmpID === scheduleDraft.CmpID,
    );
    if (!plot || !campaign) {
      Alert.alert(
        'Catálogos no disponibles',
        'Sincroniza los datos base de visitas técnicas y vuelve a intentarlo.',
      );
      return false;
    }
    const now = DateTime.utc().toISO() ?? '';
    const ownerId = user?.UsrID ?? 0;
    const existing = scheduleDraft.id
      ? (schedules.find((item) => item.id === scheduleDraft.id) ?? null)
      : null;
    await database.write(async () => {
      if (existing) {
        await existing.update((record) => {
          record.PlfID = plot.PlfID;
          record.CmpID = campaign.CmpID;
          record.TvsScheduledDate = scheduleDraft.TvsScheduledDate;
          record.TvsResponsiblePrsID = personId;
          record.TvsObservation = scheduleDraft.TvsObservation || null;
          record.TvsVisitType = scheduleDraft.TvsVisitType;
          record.PlfName = plot.PlfName;
          record.FrfName =
            farms.find((farm) => farm.FrfID === plot.FrfID)?.FrfName ?? null;
          record.CmpName = campaign.CmpName;
          record.ResponsibleName = user?.FullName ?? user?.UsrName ?? null;
          record.UpdateUserId = ownerId;
          record.UpdateDate = now;
        });
      } else {
        const syncId = randomUUID();
        await database
          .get<OagTechnicalVisitScheduleModel>(
            SYNC_RESOURCES.OagTechnicalVisitSchedule,
          )
          .create((record) => {
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
            record.TvsID = createTechnicalVisitTemporaryId();
            record.PlfID = plot.PlfID;
            record.CmpID = campaign.CmpID;
            record.TvsScheduledDate = scheduleDraft.TvsScheduledDate;
            record.TvsResponsiblePrsID = personId;
            record.TvsVisitType = scheduleDraft.TvsVisitType;
            record.TvsObservation = scheduleDraft.TvsObservation || null;
            record.PlfName = plot.PlfName;
            record.FrfName =
              farms.find((farm) => farm.FrfID === plot.FrfID)?.FrfName ?? null;
            record.CmpName = campaign.CmpName;
            record.ProducerName = null;
            record.ResponsibleName = user?.FullName ?? user?.UsrName ?? null;
          });
      }
    });
    setScheduleDraft(null);
    await refresh();
    return true;
  };
  const removeSchedule = async (row: TechnicalVisitScheduleRow) => {
    const schedule = schedules.find((item) => item.id === row.id);
    if (!schedule) return;
    const visit = visits.find(
      (item) => item.TvsID === schedule.TvsID && item.SecStatus,
    );
    if (visit)
      throw new Error(
        'No se puede eliminar una programación que ya tiene una visita.',
      );
    await database.write(async () => {
      if (schedule.syncStatus === 'created')
        await schedule.destroyPermanently();
      else await schedule.markAsDeleted();
    });
    await refresh();
  };

  const filteredRows = rows.filter((row) => {
    const scheduledAt = DateTime.fromISO(row.TvsScheduledDate, {
      setZone: true,
    });
    const from = dateFrom
      ? DateTime.fromISO(dateFrom, { setZone: true }).startOf('day')
      : null;
    const to = dateTo
      ? DateTime.fromISO(dateTo, { setZone: true }).endOf('day')
      : null;
    return (
      (!from || scheduledAt >= from) &&
      (!to || scheduledAt <= to) &&
      (visitStatus === 'all' ||
        (visitStatus === 'registered' && row.VisitStatus === 'Registrado') ||
        (visitStatus === 'pending' && row.VisitStatus === 'Sin registrar'))
    );
  });

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-4 py-4"
    >
      <NCrud
        title="Programación de visitas técnicas"
        offline={{ resource: SYNC_RESOURCES.OagTechnicalVisitSchedule }}
        add
        edit
        remove
        authorization={{ optCode: 'OAG_TECHNICAL_VISIT' }}
        onAdd={openNewSchedule}
        onEdit={openSchedule}
        onDelete={removeSchedule}
        form={{
          addTitle: 'Nueva programación de visitas técnicas',
          editTitle: 'Editar programación de visitas técnicas',
          description:
            'Guarda la programación en este dispositivo para sincronizarla después.',
          submitLabel: 'Guardar localmente',
          onClose: () => setScheduleDraft(null),
          onSubmit: saveSchedule,
          render: () =>
            scheduleDraft ? (
              <View className="gap-3">
                <NSelect
                  label="Lote"
                  items={plotOptions}
                  value={scheduleDraft.PlfID}
                  onChange={(value) =>
                    updateDraft({ PlfID: value == null ? null : Number(value) })
                  }
                  placeholder="Seleccionar lote..."
                  searchable
                  required
                />
                <NSelect
                  label="Campaña"
                  items={campaignOptions}
                  value={scheduleDraft.CmpID}
                  onChange={(value) =>
                    updateDraft({ CmpID: value == null ? null : Number(value) })
                  }
                  placeholder="Seleccionar campaña..."
                  searchable
                  required
                />
                <NDate
                  label="Fecha"
                  value={scheduleDraft.TvsScheduledDate}
                  onChange={(value) => updateDraft({ TvsScheduledDate: value })}
                  required
                />
                <NText
                  label="Observación"
                  value={scheduleDraft.TvsObservation}
                  onChange={(value) => updateDraft({ TvsObservation: value })}
                  multiline
                  numberOfLines={3}
                />
                {!plotOptions.length || !campaignOptions.length ? (
                  <Text className="text-xs text-warning">
                    Faltan lotes o campañas descargados. Sincroniza los datos
                    base para completar la programación.
                  </Text>
                ) : null}
              </View>
            ) : null,
        }}
        rows={filteredRows}
        columns={visitColumns}
        search={false}
        selectionMode="single"
        extraFilters={
          <View className="gap-3 md:flex-row">
            <NDate
              label="Fecha inicio"
              value={dateFrom || null}
              onChange={setDateFrom}
              clearable
              containerClassName="flex-1"
            />
            <NDate
              label="Fecha fin"
              value={dateTo || null}
              onChange={setDateTo}
              clearable
              containerClassName="flex-1"
            />
            <NSelectDefinition
              label="Estado visita"
              defCode="OAG_TECHNICAL_VISIT_FILTER_STATUS"
              itemText="DedDescription"
              itemValue="DedAbbreviation"
              value={visitStatus}
              onChange={(value) => {
                if (
                  value === 'all' ||
                  value === 'pending' ||
                  value === 'registered'
                )
                  setVisitStatus(value);
              }}
              containerClassName="flex-1"
            />
          </View>
        }
        filterActiveCount={
          [dateFrom, dateTo, visitStatus !== 'all' ? visitStatus : ''].filter(
            Boolean,
          ).length
        }
        onResetFilters={() => {
          setDateFrom('');
          setDateTo('');
          setVisitStatus('all');
        }}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => void refresh()}
        className="items-center py-2"
      >
        <Text className="text-sm text-muted-foreground">
          Actualizar lista local
        </Text>
      </Pressable>
    </ScrollView>
  );
}
