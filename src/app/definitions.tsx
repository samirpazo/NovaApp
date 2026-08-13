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
import { ThemeToggle } from '@/components/theme-toggle';
import {
  genDefinitionDataSource,
  genDefinitionService,
} from '@/features/general/definitions';

interface DefinitionRow extends NCrudRow {
  DefID: number;
  DefCode: string;
  DefDescription: string;
  DefStated: number;
}

interface DefinitionDraft {
  DefCode: string;
  DefDescription: string;
  active: boolean;
}

const emptyDraft: DefinitionDraft = { DefCode: '', DefDescription: '', active: true };

const columns: NCrudColumn<DefinitionRow>[] = [
  { key: 'DefID', title: 'ID', width: 64, align: 'right' },
  { key: 'DefCode', title: 'Código', width: 180, flex: 1 },
  { key: 'DefDescription', title: 'Descripción', width: 240, flex: 1.5 },
  {
    key: 'DefStated',
    title: 'Estado',
    width: 96,
    align: 'center',
    format: (row) => (
      <Text
        className={
          row.DefStated === 1
            ? 'rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase text-success'
            : 'rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive'
        }>
        {row.DefStated === 1 ? 'Activo' : 'Inactivo'}
      </Text>
    ),
  },
];

export default function DefinitionsScreen() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.Session?.User.UsrID ?? 0);
  const [formMode, setFormMode] = React.useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = React.useState<DefinitionRow | null>(null);
  const [draft, setDraft] = React.useState<DefinitionDraft>(emptyDraft);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const beginAdd = () => {
    setFormMode('add');
    setEditing(null);
    setDraft({ ...emptyDraft });
    setError(null);
  };

  const beginEdit = (row: DefinitionRow) => {
    setFormMode('edit');
    setEditing(row);
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
    setSaving(true);
    setError(null);
    try {
      await genDefinitionService.save({
        LocalId: editing?.id,
        DefCode: draft.DefCode,
        DefDescription: draft.DefDescription,
        DefStated: draft.active ? 1 : 0,
        UserId: userId,
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
        await genDefinitionService.remove(row.id);
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
      <ScrollView contentContainerClassName="mx-auto w-full max-w-7xl gap-3 px-4 pb-16 pt-3" keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()} accessibilityLabel="Volver">
            <ArrowLeft size={20} className="text-foreground" />
          </Button>
          <View className="min-w-0 flex-1">
            <Text className="text-xl font-bold">Definiciones</Text>
            <Text className="text-xs text-muted-foreground">Datos disponibles sin conexión</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <ThemeToggle />
            <Button variant="outline" size="sm" onPress={() => router.push('/definition-details')}>
              <ListTree size={16} className="text-foreground" />
              <Text>Ver valores</Text>
            </Button>
          </View>
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
          dataSource={genDefinitionDataSource}
          columns={columns}
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
