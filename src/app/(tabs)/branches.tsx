import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/auth';
import { NCrud, type NCrudColumn } from '@/components/crud';
import { NSelect, NText } from '@/components/forms';
import { Text } from '@/components/ui/text';
import { SYNC_RESOURCES } from '@/contracts/sync';
import {
  rstBranchQueries,
  rstBranchDataSource,
  rstBranchService,
  type CurrencyOption,
  type RstBranchListItem,
} from '@/features/restaurant/branches';

interface BranchDraft {
  BrhName: string;
  BrhAddress: string;
  BrhPhone: string;
  BrhEmail: string;
  BrhManagerName: string;
  BrhCurrencyDefID: number | null;
}

const emptyDraft = (): BranchDraft => ({
  BrhName: '',
  BrhAddress: '',
  BrhPhone: '',
  BrhEmail: '',
  BrhManagerName: '',
  BrhCurrencyDefID: null,
});
const columns: NCrudColumn<RstBranchListItem>[] = [
  { key: 'BrhID', title: 'ID', width: 70, align: 'right' },
  { key: 'BrhName', title: 'Nombre', width: 220, searchable: true },
  { key: 'BrhAddress', title: 'Dirección', width: 280, searchable: true },
  { key: 'BrhPhone', title: 'Teléfono', width: 140, searchable: true },
  { key: 'BrhEmail', title: 'Email', width: 220, searchable: true },
  {
    key: 'BrhManagerName',
    title: 'Encargado',
    width: 200,
    searchable: true,
  },
];

export default function BranchesScreen() {
  const userId = useAuthStore((state) => state.Session?.User.UsrID ?? 0);
  const [currencies, setCurrencies] = React.useState<CurrencyOption[]>([]);
  const [restaurantId, setRestaurantId] = React.useState<number | null>(null);
  const [editing, setEditing] = React.useState<RstBranchListItem | null>(null);
  const [draft, setDraft] = React.useState<BranchDraft>(emptyDraft);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const onError = (reason: unknown) => {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No se pudieron leer las sucursales locales.',
      );
    };
    const currenciesSubscription = rstBranchQueries.observeCurrencies(
      setCurrencies,
      onError,
    );
    const restaurantSubscription = rstBranchQueries.observeRestaurantId(
      setRestaurantId,
      onError,
    );
    return () => {
      currenciesSubscription.unsubscribe();
      restaurantSubscription.unsubscribe();
    };
  }, []);

  const currencyItems = currencies;
  const closeForm = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setError(null);
  };
  const beginAdd = () => {
    if (!restaurantId) return;
    setEditing(null);
    setDraft(emptyDraft());
    setError(null);
  };
  const beginEdit = (row: RstBranchListItem) => {
    setEditing(row);
    setDraft({
      BrhName: row.BrhName,
      BrhAddress: row.BrhAddress ?? '',
      BrhPhone: row.BrhPhone ?? '',
      BrhEmail: row.BrhEmail ?? '',
      BrhManagerName: row.BrhManagerName ?? '',
      BrhCurrencyDefID: row.BrhCurrencyDefID,
    });
    setError(null);
  };

  const save = async () => {
    const name = draft.BrhName.trim();
    const activeRestaurantId = editing?.BrhResID ?? restaurantId;
    if (!name || !activeRestaurantId) {
      setError('Nombre y restaurante son obligatorios.');
      return;
    }
    setError(null);
    try {
      await rstBranchService.save({
        LocalId: editing?.id,
        BrhResID: activeRestaurantId,
        BrhName: name,
        BrhAddress: draft.BrhAddress,
        BrhPhone: draft.BrhPhone,
        BrhEmail: draft.BrhEmail,
        BrhManagerName: draft.BrhManagerName,
        BrhCurrencyDefID: draft.BrhCurrencyDefID,
        UserId: userId,
      });
      return true;
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No se pudo guardar la sucursal local.',
      );
      return false;
    }
  };

  const remove = async (row: RstBranchListItem) => {
    try {
      await rstBranchService.remove(row.id, userId);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No se pudo eliminar la sucursal local.',
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-6xl gap-4 pb-24 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text variant="title">Sucursales</Text>
          <Text variant="caption">RstBranch · datos locales</Text>
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
          title="RstBranch"
          authorization={{ optCode: 'RST_BRANCH' }}
          offline={{ resource: SYNC_RESOURCES.RstBranch }}
          persistenceKey="rst-branches"
          form={{
            addTitle: 'Nueva sucursal',
            editTitle: 'Editar sucursal',
            description: 'El cambio quedará pendiente de sincronización',
            onSubmit: save,
            onClose: closeForm,
            render: () => (
              <>
                <View className="gap-3 md:flex-row">
                  <NText
                    label="Nombre"
                    required
                    value={draft.BrhName}
                    onChange={(BrhName) =>
                      setDraft((state) => ({ ...state, BrhName }))
                    }
                    containerClassName="flex-1"
                  />
                  <NText
                    label="Teléfono"
                    value={draft.BrhPhone}
                    onChange={(BrhPhone) =>
                      setDraft((state) => ({ ...state, BrhPhone }))
                    }
                    containerClassName="flex-1"
                  />
                </View>
                <NText
                  label="Dirección"
                  value={draft.BrhAddress}
                  onChange={(BrhAddress) =>
                    setDraft((state) => ({ ...state, BrhAddress }))
                  }
                />
                <View className="gap-3 md:flex-row">
                  <NText
                    label="Email"
                    keyboardType="email-address"
                    value={draft.BrhEmail}
                    onChange={(BrhEmail) =>
                      setDraft((state) => ({ ...state, BrhEmail }))
                    }
                    containerClassName="flex-1"
                  />
                  <NText
                    label="Encargado"
                    value={draft.BrhManagerName}
                    onChange={(BrhManagerName) =>
                      setDraft((state) => ({ ...state, BrhManagerName }))
                    }
                    containerClassName="flex-1"
                  />
                  <NSelect
                    label="Moneda"
                    items={currencyItems}
                    itemText="text"
                    itemValue="value"
                    value={draft.BrhCurrencyDefID}
                    onChange={(value) =>
                      setDraft((state) => ({
                        ...state,
                        BrhCurrencyDefID: value == null ? null : Number(value),
                      }))
                    }
                    clearable
                    containerClassName="flex-1"
                  />
                </View>
              </>
            ),
          }}
          dataSource={rstBranchDataSource}
          columns={columns}
          searchPlaceholder="Nombre, dirección o encargado"
          selectionMode="single"
          toolbar={{
            add: Boolean(restaurantId),
            edit: true,
            remove: true,
            export: true,
          }}
          onAdd={restaurantId ? beginAdd : undefined}
          onEdit={beginEdit}
          onDelete={remove}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
