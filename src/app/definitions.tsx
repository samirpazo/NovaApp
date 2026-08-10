import { randomUUID } from 'expo-crypto';
import { useRouter } from 'expo-router';
import { ArrowLeft, ListTree, Save, X } from 'lucide-react-native';
import * as React from 'react';
import { Alert, Platform, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/auth';
import { NCrud, type NCrudColumn, type NCrudRow } from '@/components/crud';
import { NText } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { SYNC_RESOURCES } from '@/contracts/sync';
import { database, GenDefinitionModel } from '@/database';

interface DefinitionRow extends NCrudRow {
  model: GenDefinitionModel;
  DefID: number;
  DefCode: string;
  DefDescription: string;
  DefStated: number;
  SecStatus: boolean;
}

interface DefinitionDraft {
  DefCode: string;
  DefDescription: string;
  active: boolean;
}

const emptyDraft: DefinitionDraft = { DefCode: '', DefDescription: '', active: true };

const columns: NCrudColumn<DefinitionRow>[] = [
  { key: 'DefID', title: 'ID', width: 80, align: 'right' },
  { key: 'DefCode', title: 'Código', width: 220 },
  { key: 'DefDescription', title: 'Descripción', width: 320 },
  { key: 'DefStated', title: 'Estado', width: 110, format: (row) => (row.DefStated === 1 ? 'Activo' : 'Inactivo') },
];

function toRow(model: GenDefinitionModel): DefinitionRow {
  return {
    id: model.id,
    model,
    syncStatus: model.syncStatus,
    DefID: model.DefID,
    DefCode: model.DefCode,
    DefDescription: model.DefDescription,
    DefStated: model.DefStated,
    SecStatus: model.SecStatus,
  };
}

export default function DefinitionsScreen() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.Session?.User.UsrID ?? 0);
  const [models, setModels] = React.useState<GenDefinitionModel[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formMode, setFormMode] = React.useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = React.useState<GenDefinitionModel | null>(null);
  const [draft, setDraft] = React.useState<DefinitionDraft>(emptyDraft);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const query = database.get<GenDefinitionModel>(SYNC_RESOURCES.GenDefinition).query();
    const subscription = query.observe().subscribe({
      next: (records) => {
        setModels([...records].sort((a, b) => a.DefDescription.localeCompare(b.DefDescription)));
        setLoading(false);
      },
      error: (reason) => {
        setError(reason instanceof Error ? reason.message : 'No se pudieron leer las definiciones locales.');
        setLoading(false);
      },
    });
    return () => subscription.unsubscribe();
  }, []);

  const rows = React.useMemo(() => models.map(toRow), [models]);

  const beginAdd = () => {
    setFormMode('add');
    setEditing(null);
    setDraft({ ...emptyDraft });
    setError(null);
  };

  const beginEdit = (row: DefinitionRow) => {
    setFormMode('edit');
    setEditing(row.model);
    setDraft({ DefCode: row.DefCode, DefDescription: row.DefDescription, active: row.DefStated === 1 });
    setError(null);
  };

  const cancelForm = () => {
    setFormMode(null);
    setEditing(null);
    setDraft(emptyDraft);
    setError(null);
  };

  const save = async () => {
    const code = draft.DefCode.trim().toUpperCase();
    const description = draft.DefDescription.trim();
    if (!code || !description) {
      setError('Código y descripción son obligatorios.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await database.write(async () => {
        if (editing) {
          await editing.update((record) => {
            record.DefCode = code;
            record.DefDescription = description;
            record.DefStated = draft.active ? 1 : 0;
            record.SecStatus = draft.active;
            record.UpdateUserId = userId;
            record.UpdateDate = new Date().toISOString();
          });
          return;
        }

        const temporaryId = Math.min(0, ...models.map((record) => record.DefID)) - 1;
        const syncId = randomUUID();
        await database.get<GenDefinitionModel>(SYNC_RESOURCES.GenDefinition).create((record) => {
          record._raw.id = syncId;
          record.SyncId = syncId;
          record.SyncVersion = '';
          record.SecStatus = draft.active;
          record.CreateUserId = userId;
          record.UpdateUserId = null;
          record.DeleteUserId = null;
          record.CreateDate = new Date().toISOString();
          record.UpdateDate = null;
          record.DeleteDate = null;
          record.DefID = temporaryId;
          record.DefCode = code;
          record.DefDescription = description;
          record.DefStated = draft.active ? 1 : 0;
        });
      });
      cancelForm();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar el registro local.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: DefinitionRow) => {
    const execute = async () => {
      try {
        await database.write(() => row.model.markAsDeleted());
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'No se pudo eliminar el registro local.');
      }
    };

    if (Platform.OS === 'web') {
      if (globalThis.confirm(`¿Eliminar la definición ${row.DefCode}?`)) await execute();
      return;
    }
    Alert.alert('Eliminar definición', `¿Eliminar la definición ${row.DefCode}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: execute },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="mx-auto w-full max-w-6xl gap-4 px-4 pb-24 pt-4" keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()} accessibilityLabel="Volver">
            <ArrowLeft size={20} />
          </Button>
          <View className="min-w-0 flex-1">
            <Text variant="title">Definiciones</Text>
            <Text variant="caption">Datos disponibles sin conexión</Text>
          </View>
          <Button variant="outline" size="sm" onPress={() => router.push('/definition-details')}>
            <ListTree size={17} />
            <Text>Ver valores</Text>
          </Button>
        </View>

        {formMode ? (
          <View className="gap-4 rounded-lg border border-border bg-card p-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-base font-semibold">{editing ? 'Editar definición' : 'Nueva definición'}</Text>
                <Text variant="caption">El cambio quedará pendiente de sincronización</Text>
              </View>
              <Button variant="ghost" size="icon" onPress={cancelForm} accessibilityLabel="Cerrar formulario"><X size={18} /></Button>
            </View>
            <View className="gap-4 md:flex-row">
              <NText label="Código" required uppercase value={draft.DefCode} onChange={(DefCode) => setDraft((value) => ({ ...value, DefCode }))} containerClassName="flex-1" />
              <NText label="Descripción" required value={draft.DefDescription} onChange={(DefDescription) => setDraft((value) => ({ ...value, DefDescription }))} containerClassName="flex-[2]" />
            </View>
            <View className="flex-row items-center justify-between border-t border-border pt-4">
              <View className="flex-row items-center gap-3">
                <Switch value={draft.active} onValueChange={(active) => setDraft((value) => ({ ...value, active }))} />
                <Text variant="small">Activo</Text>
              </View>
              <Button disabled={saving} onPress={save}>
                <Save size={17} className="text-primary-foreground" />
                <Text>{saving ? 'Guardando...' : 'Guardar localmente'}</Text>
              </Button>
            </View>
          </View>
        ) : null}

        {error ? <Text className="text-sm text-destructive" role="alert">{error}</Text> : null}

        <NCrud
          title="GenDefinition"
          rows={rows}
          columns={columns}
          loading={loading}
          searchPlaceholder="Código o descripción"
          searchText={(row) => `${row.DefCode} ${row.DefDescription}`}
          onAdd={beginAdd}
          onEdit={beginEdit}
          onDelete={remove}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
