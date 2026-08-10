import { randomUUID } from 'expo-crypto';
import { useRouter } from 'expo-router';
import { ArrowLeft, Save, X } from 'lucide-react-native';
import * as React from 'react';
import { Alert, Platform, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/auth';
import { NCrud, type NCrudColumn, type NCrudRow } from '@/components/crud';
import { NSelect, NText } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { SYNC_RESOURCES } from '@/contracts/sync';
import { database, GenDefinitionDetailModel, GenDefinitionModel } from '@/database';

interface DetailRow extends NCrudRow {
  model: GenDefinitionDetailModel;
  DedID: number;
  DedValue: number;
  DedDescription: string;
  DedAbbreviation: string | null;
  DedHelper: string | null;
  DedHelper2: string | null;
  DedStated: number;
}

interface DetailDraft {
  DedValue: string;
  DedDescription: string;
  DedAbbreviation: string;
  DedFormat: string;
  DedGroup: string;
  DedHelper: string;
  DedHelper2: string;
  DedIcon: string;
  DedColor: string;
  active: boolean;
}

const emptyDraft = (): DetailDraft => ({
  DedValue: '', DedDescription: '', DedAbbreviation: '', DedFormat: '', DedGroup: '',
  DedHelper: '', DedHelper2: '', DedIcon: '', DedColor: '', active: true,
});

const columns: NCrudColumn<DetailRow>[] = [
  { key: 'DedValue', title: 'Valor', width: 85, align: 'right' },
  { key: 'DedDescription', title: 'Descripción', width: 280 },
  { key: 'DedAbbreviation', title: 'Abreviatura', width: 130 },
  { key: 'DedHelper', title: 'Aux. 1', width: 170 },
  { key: 'DedHelper2', title: 'Aux. 2', width: 170 },
  { key: 'DedStated', title: 'Estado', width: 100, format: (row) => row.DedStated === 1 ? 'Activo' : 'Inactivo' },
];

const nullable = (value: string) => value.trim() || null;

function toRow(model: GenDefinitionDetailModel): DetailRow {
  return {
    id: model.id,
    model,
    syncStatus: model.syncStatus,
    DedID: model.DedID,
    DedValue: model.DedValue,
    DedDescription: model.DedDescription,
    DedAbbreviation: model.DedAbbreviation,
    DedHelper: model.DedHelper,
    DedHelper2: model.DedHelper2,
    DedStated: model.DedStated,
  };
}

export default function DefinitionDetailsScreen() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.Session?.User.UsrID ?? 0);
  const [definitions, setDefinitions] = React.useState<GenDefinitionModel[]>([]);
  const [details, setDetails] = React.useState<GenDefinitionDetailModel[]>([]);
  const [definitionId, setDefinitionId] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [formMode, setFormMode] = React.useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = React.useState<GenDefinitionDetailModel | null>(null);
  const [draft, setDraft] = React.useState<DetailDraft>(emptyDraft);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const definitionSubscription = database.get<GenDefinitionModel>(SYNC_RESOURCES.GenDefinition).query().observe().subscribe((records) => {
      const sorted = [...records].sort((a, b) => a.DefDescription.localeCompare(b.DefDescription));
      setDefinitions(sorted);
      setDefinitionId((current) => current ?? sorted[0]?.DefID ?? null);
    });
    const detailSubscription = database.get<GenDefinitionDetailModel>(SYNC_RESOURCES.GenDefinitionDetail).query().observe().subscribe({
      next: (records) => {
        setDetails([...records]);
        setLoading(false);
      },
      error: (reason) => {
        setError(reason instanceof Error ? reason.message : 'No se pudieron leer los detalles locales.');
        setLoading(false);
      },
    });
    return () => {
      definitionSubscription.unsubscribe();
      detailSubscription.unsubscribe();
    };
  }, []);

  const selectedDefinition = definitions.find((definition) => definition.DefID === definitionId) ?? null;
  const currentDetails = React.useMemo(
    () => details.filter((detail) => detail.DefID === definitionId).sort((a, b) => a.DedValue - b.DedValue),
    [definitionId, details],
  );
  const rows = React.useMemo(() => currentDetails.map(toRow), [currentDetails]);
  const definitionItems = React.useMemo(
    () => definitions.map((definition) => ({ value: definition.DefID, text: `${definition.DefCode} · ${definition.DefDescription}` })),
    [definitions],
  );

  const closeForm = () => {
    setFormMode(null);
    setEditing(null);
    setDraft(emptyDraft());
    setError(null);
  };

  const beginAdd = () => {
    if (!selectedDefinition) return;
    const nextValue = Math.max(0, ...currentDetails.map((detail) => detail.DedValue)) + 1;
    setFormMode('add');
    setEditing(null);
    setDraft({ ...emptyDraft(), DedValue: String(nextValue) });
    setError(null);
  };

  const beginEdit = (row: DetailRow) => {
    const model = row.model;
    setFormMode('edit');
    setEditing(model);
    setDraft({
      DedValue: String(model.DedValue), DedDescription: model.DedDescription,
      DedAbbreviation: model.DedAbbreviation ?? '', DedFormat: model.DedFormat ?? '',
      DedGroup: model.DedGroup ?? '', DedHelper: model.DedHelper ?? '', DedHelper2: model.DedHelper2 ?? '',
      DedIcon: model.DedIcon ?? '', DedColor: model.DedColor ?? '', active: model.DedStated === 1,
    });
    setError(null);
  };

  const save = async () => {
    const value = Number(draft.DedValue);
    const description = draft.DedDescription.trim();
    if (!selectedDefinition || !Number.isInteger(value) || value < 0 || !description) {
      setError('Definición, valor y descripción son obligatorios.');
      return;
    }
    const duplicate = currentDetails.some((detail) => detail.id !== editing?.id && detail.DedValue === value);
    if (duplicate) {
      setError(`El valor ${value} ya existe en esta definición.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await database.write(async () => {
        const apply = (record: GenDefinitionDetailModel) => {
          record.DefID = selectedDefinition.DefID;
          record.DedCode = selectedDefinition.DefCode;
          record.DedValue = value;
          record.DedDescription = description;
          record.DedAbbreviation = nullable(draft.DedAbbreviation);
          record.DedFormat = nullable(draft.DedFormat);
          record.DedGroup = nullable(draft.DedGroup);
          record.DedHelper = nullable(draft.DedHelper);
          record.DedHelper2 = nullable(draft.DedHelper2);
          record.DedIcon = nullable(draft.DedIcon);
          record.DedColor = nullable(draft.DedColor);
          record.DedStated = draft.active ? 1 : 0;
          record.SecStatus = draft.active;
        };
        if (editing) {
          await editing.update((record) => {
            apply(record);
            record.UpdateUserId = userId;
            record.UpdateDate = new Date().toISOString();
          });
          return;
        }
        const temporaryId = Math.min(0, ...details.map((detail) => detail.DedID)) - 1;
        const syncId = randomUUID();
        await database.get<GenDefinitionDetailModel>(SYNC_RESOURCES.GenDefinitionDetail).create((record) => {
          record._raw.id = syncId;
          record.SyncId = syncId;
          record.SyncVersion = '';
          record.CreateUserId = userId;
          record.UpdateUserId = null;
          record.DeleteUserId = null;
          record.CreateDate = new Date().toISOString();
          record.UpdateDate = null;
          record.DeleteDate = null;
          record.DedID = temporaryId;
          record.DedImagePath = null;
          apply(record);
        });
      });
      closeForm();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar el detalle local.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: DetailRow) => {
    const execute = async () => {
      try {
        await database.write(() => row.model.markAsDeleted());
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'No se pudo eliminar el detalle local.');
      }
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm(`¿Eliminar el valor ${row.DedDescription}?`)) await execute();
      return;
    }
    Alert.alert('Eliminar valor', `¿Eliminar el valor ${row.DedDescription}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: execute },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="mx-auto w-full max-w-6xl gap-4 px-4 pb-24 pt-4" keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()} accessibilityLabel="Volver"><ArrowLeft size={20} /></Button>
          <View className="min-w-0 flex-1"><Text variant="title">Valores de definición</Text><Text variant="caption">GenDefinitionDetail · datos locales</Text></View>
        </View>

        <NSelect label="Definición" items={definitionItems} itemText="text" itemValue="value" value={definitionId} onChange={(value) => { setDefinitionId(Number(value)); closeForm(); }} searchable required />

        {formMode ? (
          <View className="gap-4 rounded-lg border border-border bg-card p-4">
            <View className="flex-row items-center justify-between"><View><Text className="text-base font-semibold">{editing ? 'Editar valor' : 'Nuevo valor'}</Text><Text variant="caption">{selectedDefinition?.DefCode}</Text></View><Button variant="ghost" size="icon" onPress={closeForm} accessibilityLabel="Cerrar formulario"><X size={18} /></Button></View>
            <View className="gap-4 md:flex-row">
              <NText label="Descripción" required value={draft.DedDescription} onChange={(DedDescription) => setDraft((state) => ({ ...state, DedDescription }))} containerClassName="flex-[2]" />
              <NText label="Valor" required number value={draft.DedValue} editable={formMode === 'edit'} onChange={(DedValue) => setDraft((state) => ({ ...state, DedValue }))} containerClassName="flex-1" />
              <NText label="Abreviatura" uppercase value={draft.DedAbbreviation} onChange={(DedAbbreviation) => setDraft((state) => ({ ...state, DedAbbreviation }))} containerClassName="flex-1" />
            </View>
            <View className="gap-4 md:flex-row">
              <NText label="Formato" value={draft.DedFormat} onChange={(DedFormat) => setDraft((state) => ({ ...state, DedFormat }))} containerClassName="flex-1" />
              <NText label="Grupo" value={draft.DedGroup} onChange={(DedGroup) => setDraft((state) => ({ ...state, DedGroup }))} containerClassName="flex-1" />
              <NText label="Icono" value={draft.DedIcon} onChange={(DedIcon) => setDraft((state) => ({ ...state, DedIcon }))} containerClassName="flex-1" />
              <NText label="Color" value={draft.DedColor} onChange={(DedColor) => setDraft((state) => ({ ...state, DedColor }))} containerClassName="flex-1" />
            </View>
            <View className="gap-4 md:flex-row">
              <NText label="Auxiliar 1" value={draft.DedHelper} onChange={(DedHelper) => setDraft((state) => ({ ...state, DedHelper }))} containerClassName="flex-1" />
              <NText label="Auxiliar 2" value={draft.DedHelper2} onChange={(DedHelper2) => setDraft((state) => ({ ...state, DedHelper2 }))} containerClassName="flex-1" />
            </View>
            <View className="flex-row items-center justify-between border-t border-border pt-4"><View className="flex-row items-center gap-3"><Switch value={draft.active} onValueChange={(active) => setDraft((state) => ({ ...state, active }))} /><Text variant="small">Activo</Text></View><Button disabled={saving} onPress={save}><Save size={17} className="text-primary-foreground" /><Text>{saving ? 'Guardando...' : 'Guardar localmente'}</Text></Button></View>
          </View>
        ) : null}

        {error ? <Text className="text-sm text-destructive" role="alert">{error}</Text> : null}
        <NCrud title={selectedDefinition ? `Valores: ${selectedDefinition.DefDescription}` : 'GenDefinitionDetail'} rows={rows} columns={columns} loading={loading} searchPlaceholder="Descripción, abreviatura o auxiliar" searchText={(row) => `${row.DedValue} ${row.DedDescription} ${row.DedAbbreviation ?? ''} ${row.DedHelper ?? ''} ${row.DedHelper2 ?? ''}`} onAdd={selectedDefinition ? beginAdd : undefined} onEdit={beginEdit} onDelete={remove} />
      </ScrollView>
    </SafeAreaView>
  );
}
