import { useRouter } from 'expo-router';
import { ArrowLeft, Save } from 'lucide-react-native';
import * as React from 'react';
import { Alert, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/auth';
import { NCrud, type NCrudColumn, type NCrudRow } from '@/components/crud';
import { NFormPanel, NSelect, NText } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  rstBranchQueries,
  rstBranchService,
  type CurrencyOption,
  type RstBranchListItem,
} from '@/features/restaurant/branches';

interface BranchRow extends NCrudRow {
  BrhID: number;
  BrhName: string;
  BrhAddress: string | null;
  BrhPhone: string | null;
  BrhEmail: string | null;
  BrhManagerName: string | null;
}

interface BranchDraft {
  BrhName: string;
  BrhAddress: string;
  BrhPhone: string;
  BrhEmail: string;
  BrhManagerName: string;
  BrhCurrencyDefID: number | null;
}

const emptyDraft = (): BranchDraft => ({ BrhName: '', BrhAddress: '', BrhPhone: '', BrhEmail: '', BrhManagerName: '', BrhCurrencyDefID: null });
const columns: NCrudColumn<BranchRow>[] = [
  { key: 'BrhID', title: 'ID', width: 70, align: 'right' },
  { key: 'BrhName', title: 'Nombre', width: 220 },
  { key: 'BrhAddress', title: 'Dirección', width: 280 },
  { key: 'BrhPhone', title: 'Teléfono', width: 140 },
  { key: 'BrhEmail', title: 'Email', width: 220 },
  { key: 'BrhManagerName', title: 'Encargado', width: 200 },
];

function toRow(model: RstBranchListItem): BranchRow {
  return { id: model.LocalId, syncStatus: model.SyncStatus, BrhID: model.BrhID, BrhName: model.BrhName, BrhAddress: model.BrhAddress, BrhPhone: model.BrhPhone, BrhEmail: model.BrhEmail, BrhManagerName: model.BrhManagerName };
}

export default function BranchesScreen() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.Session?.User.UsrID ?? 0);
  const [branches, setBranches] = React.useState<RstBranchListItem[]>([]);
  const [currencies, setCurrencies] = React.useState<CurrencyOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formMode, setFormMode] = React.useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = React.useState<RstBranchListItem | null>(null);
  const [draft, setDraft] = React.useState<BranchDraft>(emptyDraft);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const onError = (reason: unknown) => { setError(reason instanceof Error ? reason.message : 'No se pudieron leer las sucursales locales.'); setLoading(false); };
    const currenciesSubscription = rstBranchQueries.observeCurrencies(setCurrencies, onError);
    const branchSubscription = rstBranchQueries.observeActive((records) => { setBranches(records); setLoading(false); }, onError);
    return () => { currenciesSubscription.unsubscribe(); branchSubscription.unsubscribe(); };
  }, []);

  const rows = React.useMemo(() => branches.map(toRow), [branches]);
  const restaurantId = branches[0]?.BrhResID ?? null;
  const currencyItems = currencies;
  const closeForm = () => { setFormMode(null); setEditing(null); setDraft(emptyDraft()); setError(null); };
  const beginAdd = () => { if (!restaurantId) return; setFormMode('add'); setEditing(null); setDraft(emptyDraft()); setError(null); };
  const beginEdit = (row: BranchRow) => {
    const model = branches.find((branch) => branch.LocalId === row.id);
    if (!model) return;
    setFormMode('edit'); setEditing(model);
    setDraft({ BrhName: model.BrhName, BrhAddress: model.BrhAddress ?? '', BrhPhone: model.BrhPhone ?? '', BrhEmail: model.BrhEmail ?? '', BrhManagerName: model.BrhManagerName ?? '', BrhCurrencyDefID: model.BrhCurrencyDefID });
    setError(null);
  };

  const save = async () => {
    const name = draft.BrhName.trim();
    const activeRestaurantId = editing?.BrhResID ?? restaurantId;
    if (!name || !activeRestaurantId) { setError('Nombre y restaurante son obligatorios.'); return; }
    setSaving(true); setError(null);
    try {
      await rstBranchService.save({
        LocalId: editing?.LocalId, BrhResID: activeRestaurantId, BrhName: name,
        BrhAddress: draft.BrhAddress, BrhPhone: draft.BrhPhone, BrhEmail: draft.BrhEmail,
        BrhManagerName: draft.BrhManagerName, BrhCurrencyDefID: draft.BrhCurrencyDefID, UserId: userId,
      });
      closeForm();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo guardar la sucursal local.'); }
    finally { setSaving(false); }
  };

  const remove = async (row: BranchRow) => {
    const execute = async () => { try { await rstBranchService.remove(row.id); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo eliminar la sucursal local.'); } };
    if (Platform.OS === 'web') { if (globalThis.confirm(`¿Eliminar la sucursal ${row.BrhName}?`)) await execute(); return; }
    Alert.alert('Eliminar sucursal', `¿Eliminar la sucursal ${row.BrhName}?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: execute }]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background"><ScrollView contentContainerClassName="mx-auto w-full max-w-6xl gap-4 px-4 pb-24 pt-4" keyboardShouldPersistTaps="handled">
      <View className="flex-row items-center gap-3"><Button variant="ghost" size="icon" onPress={() => router.back()} accessibilityLabel="Volver"><ArrowLeft size={20} /></Button><View><Text variant="title">Sucursales</Text><Text variant="caption">RstBranch · datos locales</Text></View></View>
      {error ? <Text className="text-sm text-destructive" role="alert">{error}</Text> : null}
      <NCrud
        title="RstBranch"
        form={formMode ? (
          <NFormPanel
            title={editing ? 'Editar sucursal' : 'Nueva sucursal'}
            description="El cambio quedará pendiente de sincronización"
            onClose={closeForm}
            footer={
              <View className="flex-1 items-end">
                <Button className="h-8 px-3" disabled={saving} onPress={save}>
                  <Save size={14} className="text-primary-foreground" />
                  <Text className="text-xs">{saving ? 'Guardando...' : 'Guardar localmente'}</Text>
                </Button>
              </View>
            }>
            <View className="gap-3 md:flex-row">
              <NText label="Nombre" required value={draft.BrhName} onChange={(BrhName) => setDraft((state) => ({ ...state, BrhName }))} containerClassName="flex-1" />
              <NText label="Teléfono" value={draft.BrhPhone} onChange={(BrhPhone) => setDraft((state) => ({ ...state, BrhPhone }))} containerClassName="flex-1" />
            </View>
            <NText label="Dirección" value={draft.BrhAddress} onChange={(BrhAddress) => setDraft((state) => ({ ...state, BrhAddress }))} />
            <View className="gap-3 md:flex-row">
              <NText label="Email" keyboardType="email-address" value={draft.BrhEmail} onChange={(BrhEmail) => setDraft((state) => ({ ...state, BrhEmail }))} containerClassName="flex-1" />
              <NText label="Encargado" value={draft.BrhManagerName} onChange={(BrhManagerName) => setDraft((state) => ({ ...state, BrhManagerName }))} containerClassName="flex-1" />
              <NSelect label="Moneda" items={currencyItems} itemText="text" itemValue="value" value={draft.BrhCurrencyDefID} onChange={(value) => setDraft((state) => ({ ...state, BrhCurrencyDefID: value == null ? null : Number(value) }))} clearable containerClassName="flex-1" />
            </View>
          </NFormPanel>
        ) : undefined}
        rows={rows}
        columns={columns}
        loading={loading}
        searchPlaceholder="Nombre, dirección o encargado"
        searchText={(row) => `${row.BrhName} ${row.BrhAddress ?? ''} ${row.BrhManagerName ?? ''}`}
        onAdd={restaurantId ? beginAdd : undefined}
        onEdit={beginEdit}
        onDelete={remove}
      />
    </ScrollView></SafeAreaView>
  );
}
