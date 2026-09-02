import { useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/auth';
import { NCrud, type NCrudColumn, type NCrudRow } from '@/components/crud';
import { NSwitch, NText } from '@/components/forms';
import { Text } from '@/components/ui/text';
import { SYNC_RESOURCES } from '@/contracts/sync';
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

const emptyDraft: DefinitionDraft = {
  DefCode: '',
  DefDescription: '',
  active: true,
};

const columns: NCrudColumn<DefinitionRow>[] = [
  { key: 'DefID', title: 'ID', width: 64, align: 'right' },
  { key: 'DefCode', title: 'Código', width: 180, flex: 1, searchable: true },
  {
    key: 'DefDescription',
    title: 'Descripción',
    width: 240,
    flex: 1.5,
    searchable: true,
  },
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
        }
      >
        {row.DefStated === 1 ? 'Activo' : 'Inactivo'}
      </Text>
    ),
  },
];

export default function DefinitionsScreen() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.Session?.User.UsrID ?? 0);
  const [editing, setEditing] = React.useState<DefinitionRow | null>(null);
  const [draft, setDraft] = React.useState<DefinitionDraft>(emptyDraft);
  const [error, setError] = React.useState<string | null>(null);

  const beginAdd = () => {
    setEditing(null);
    setDraft({ ...emptyDraft });
    setError(null);
  };

  const beginEdit = (row: DefinitionRow) => {
    setEditing(row);
    setDraft({
      DefCode: row.DefCode,
      DefDescription: row.DefDescription,
      active: row.DefStated === 1,
    });
    setError(null);
  };

  const cancelForm = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setError(null);
  };

  const save = async () => {
    setError(null);
    try {
      await genDefinitionService.save({
        LocalId: editing?.id,
        DefCode: draft.DefCode,
        DefDescription: draft.DefDescription,
        DefStated: draft.active ? 1 : 0,
        UserId: userId,
      });
      return true;
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No se pudo guardar el registro local.',
      );
      return false;
    }
  };

  const remove = async (row: DefinitionRow) => {
    try {
      await genDefinitionService.remove(row.id, userId);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No se pudo eliminar el registro local.',
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-7xl gap-3 pb-16 pt-3"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-center gap-2">
          <View className="min-w-0 flex-1">
            <Text className="text-lg font-poppins-semibold">Definiciones</Text>
            <Text className="text-xs text-muted-foreground">
              Datos disponibles sin conexión
            </Text>
          </View>
        </View>

        {error ? (
          <Text
            className="text-sm text-destructive"
            role="alert"
          >
            {error}
          </Text>
        ) : null}

        <NCrud
          title="Definiciones"
          authorization={{ optCode: 'GEN_DEFINITIONS' }}
          offline={{ resource: SYNC_RESOURCES.GenDefinition }}
          config={{ dataSource: genDefinitionDataSource, columns }}
          form={{
            addTitle: 'Nueva definición',
            editTitle: 'Editar definición',
            description: 'El cambio quedará pendiente de sincronización',
            onSubmit: save,
            onClose: cancelForm,
            footer: () => (
              <NSwitch
                value={draft.active}
                onValueChange={(active) =>
                  setDraft((value) => ({ ...value, active }))
                }
                label="Activo"
              />
            ),
            render: () => (
              <View className="gap-3 md:flex-row">
                <NText
                  label="Código"
                  required
                  uppercase
                  value={draft.DefCode}
                  onChange={(DefCode) =>
                    setDraft((value) => ({ ...value, DefCode }))
                  }
                  containerClassName="flex-1"
                />
                <NText
                  label="Descripción"
                  required
                  value={draft.DefDescription}
                  onChange={(DefDescription) =>
                    setDraft((value) => ({ ...value, DefDescription }))
                  }
                  containerClassName="flex-[2]"
                />
              </View>
            ),
          }}
          searchPlaceholder="Código o descripción"
          searchText={(row) => `${row.DefCode} ${row.DefDescription}`}
          selectionMode="single"
          add
          edit
          remove
          export
          extraActions={[
            {
              id: 'details',
              label: 'Ver valores',
              kind: 'custom',
              minSelection: 1,
              maxSelection: 1,
              onPress: ([row]) => {
                if (!row) return;
                router.push({
                  pathname: '/definition-details',
                  params: { definitionId: String(row.DefID) },
                });
              },
            },
          ]}
          onAdd={beginAdd}
          onEdit={beginEdit}
          onDelete={remove}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
