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
import { database, GenDefinitionDetailModel, GenDefinitionModel, RstBranchModel } from '@/database';

interface BranchRow extends NCrudRow {
  model: RstBranchModel;
  BrhID: number;
  BrhName: string;
  BrhAddress: string | null;
  BrhPhone: string | null;
  BrhEmail: string | null;
  BrhManagerName: string | null;
  SecStatus: boolean;
}

interface BranchDraft {
  BrhName: string;
  BrhAddress: string;
  BrhPhone: string;
  BrhEmail: string;
  BrhManagerName: string;
  BrhCurrencyDefID: number | null;
  active: boolean;
}

const emptyDraft = (): BranchDraft => ({ BrhName: '', BrhAddress: '', BrhPhone: '', BrhEmail: '', BrhManagerName: '', BrhCurrencyDefID: null, active: true });
const nullable = (value: string) => value.trim() || null;
const columns: NCrudColumn<BranchRow>[] = [
  { key: 'BrhID', title: 'ID', width: 70, align: 'right' },
  { key: 'BrhName', title: 'Nombre', width: 220 },
  { key: 'BrhAddress', title: 'Dirección', width: 280 },
  { key: 'BrhPhone', title: 'Teléfono', width: 140 },
  { key: 'BrhEmail', title: 'Email', width: 220 },
  { key: 'BrhManagerName', title: 'Encargado', width: 200 },
  { key: 'SecStatus', title: 'Estado', width: 100, format: (row) => row.SecStatus ? 'Activo' : 'Inactivo' },
];

function toRow(model: RstBranchModel): BranchRow {
  return { id: model.id, model, syncStatus: model.syncStatus, BrhID: model.BrhID, BrhName: model.BrhName, BrhAddress: model.BrhAddress, BrhPhone: model.BrhPhone, BrhEmail: model.BrhEmail, BrhManagerName: model.BrhManagerName, SecStatus: model.SecStatus };
}

export default function BranchesScreen() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.Session?.User.UsrID ?? 0);
  const [branches, setBranches] = React.useState<RstBranchModel[]>([]);
  const [currencies, setCurrencies] = React.useState<GenDefinitionDetailModel[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formMode, setFormMode] = React.useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = React.useState<RstBranchModel | null>(null);
  const [draft, setDraft] = React.useState<BranchDraft>(emptyDraft);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let definitionIds: number[] = [];
    const definitionsSubscription = database.get<GenDefinitionModel>(SYNC_RESOURCES.GenDefinition).query().observe().subscribe((records) => {
      definitionIds = records.filter((record) => record.DefCode === 'GEN_CURRENCY').map((record) => record.DefID);
      database.get<GenDefinitionDetailModel>(SYNC_RESOURCES.GenDefinitionDetail).query().fetch().then((details) => setCurrencies(details.filter((detail) => definitionIds.includes(detail.DefID))));
    });
    const branchSubscription = database.get<RstBranchModel>(SYNC_RESOURCES.RstBranch).query().observe().subscribe({
      next: (records) => { setBranches([...records].sort((a, b) => a.BrhName.localeCompare(b.BrhName))); setLoading(false); },
      error: (reason) => { setError(reason instanceof Error ? reason.message : 'No se pudieron leer las sucursales locales.'); setLoading(false); },
    });
    return () => { definitionsSubscription.unsubscribe(); branchSubscription.unsubscribe(); };
  }, []);

  const rows = React.useMemo(() => branches.map(toRow), [branches]);
  const restaurantId = branches[0]?.BrhResID ?? null;
  const currencyItems = currencies.map((currency) => ({ value: currency.DedValue, text: currency.DedDescription }));
  const closeForm = () => { setFormMode(null); setEditing(null); setDraft(emptyDraft()); setError(null); };
  const beginAdd = () => { if (!restaurantId) return; setFormMode('add'); setEditing(null); setDraft(emptyDraft()); setError(null); };
  const beginEdit = (row: BranchRow) => {
    const model = row.model;
    setFormMode('edit'); setEditing(model);
    setDraft({ BrhName: model.BrhName, BrhAddress: model.BrhAddress ?? '', BrhPhone: model.BrhPhone ?? '', BrhEmail: model.BrhEmail ?? '', BrhManagerName: model.BrhManagerName ?? '', BrhCurrencyDefID: model.BrhCurrencyDefID, active: model.SecStatus });
    setError(null);
  };

  const save = async () => {
    const name = draft.BrhName.trim();
    const activeRestaurantId = editing?.BrhResID ?? restaurantId;
    if (!name || !activeRestaurantId) { setError('Nombre y restaurante son obligatorios.'); return; }
    setSaving(true); setError(null);
    try {
      await database.write(async () => {
        const apply = (record: RstBranchModel) => {
          record.BrhResID = activeRestaurantId; record.BrhName = name; record.BrhAddress = nullable(draft.BrhAddress);
          record.BrhPhone = nullable(draft.BrhPhone); record.BrhEmail = nullable(draft.BrhEmail);
          record.BrhManagerName = nullable(draft.BrhManagerName); record.BrhCurrencyDefID = draft.BrhCurrencyDefID;
          record.SecStatus = draft.active;
        };
        if (editing) {
          await editing.update((record) => { apply(record); record.UpdateUserId = userId; record.UpdateDate = new Date().toISOString(); });
          return;
        }
        const temporaryId = Math.min(0, ...branches.map((branch) => branch.BrhID)) - 1;
        await database.get<RstBranchModel>(SYNC_RESOURCES.RstBranch).create((record) => {
          record.SyncId = randomUUID(); record.SyncVersion = ''; record.CreateUserId = userId; record.UpdateUserId = null;
          record.DeleteUserId = null; record.CreateDate = new Date().toISOString(); record.UpdateDate = null; record.DeleteDate = null;
          record.BrhID = temporaryId; apply(record);
        });
      });
      closeForm();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo guardar la sucursal local.'); }
    finally { setSaving(false); }
  };

  const remove = async (row: BranchRow) => {
    const execute = async () => { try { await database.write(() => row.model.markAsDeleted()); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo eliminar la sucursal local.'); } };
    if (Platform.OS === 'web') { if (globalThis.confirm(`¿Eliminar la sucursal ${row.BrhName}?`)) await execute(); return; }
    Alert.alert('Eliminar sucursal', `¿Eliminar la sucursal ${row.BrhName}?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: execute }]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background"><ScrollView contentContainerClassName="mx-auto w-full max-w-6xl gap-4 px-4 pb-24 pt-4" keyboardShouldPersistTaps="handled">
      <View className="flex-row items-center gap-3"><Button variant="ghost" size="icon" onPress={() => router.back()} accessibilityLabel="Volver"><ArrowLeft size={20} /></Button><View><Text variant="title">Sucursales</Text><Text variant="caption">RstBranch · datos locales</Text></View></View>
      {formMode ? <View className="gap-4 rounded-lg border border-border bg-card p-4">
        <View className="flex-row items-center justify-between"><View><Text className="text-base font-semibold">{editing ? 'Editar sucursal' : 'Nueva sucursal'}</Text><Text variant="caption">El cambio quedará pendiente de sincronización</Text></View><Button variant="ghost" size="icon" onPress={closeForm} accessibilityLabel="Cerrar formulario"><X size={18} /></Button></View>
        <View className="gap-4 md:flex-row"><NText label="Nombre" required value={draft.BrhName} onChange={(BrhName) => setDraft((state) => ({ ...state, BrhName }))} containerClassName="flex-1" /><NText label="Teléfono" value={draft.BrhPhone} onChange={(BrhPhone) => setDraft((state) => ({ ...state, BrhPhone }))} containerClassName="flex-1" /></View>
        <NText label="Dirección" value={draft.BrhAddress} onChange={(BrhAddress) => setDraft((state) => ({ ...state, BrhAddress }))} />
        <View className="gap-4 md:flex-row"><NText label="Email" keyboardType="email-address" value={draft.BrhEmail} onChange={(BrhEmail) => setDraft((state) => ({ ...state, BrhEmail }))} containerClassName="flex-1" /><NText label="Encargado" value={draft.BrhManagerName} onChange={(BrhManagerName) => setDraft((state) => ({ ...state, BrhManagerName }))} containerClassName="flex-1" /><NSelect label="Moneda" items={currencyItems} itemText="text" itemValue="value" value={draft.BrhCurrencyDefID} onChange={(value) => setDraft((state) => ({ ...state, BrhCurrencyDefID: value == null ? null : Number(value) }))} clearable containerClassName="flex-1" /></View>
        <View className="flex-row items-center justify-between border-t border-border pt-4"><View className="flex-row items-center gap-3"><Switch value={draft.active} onValueChange={(active) => setDraft((state) => ({ ...state, active }))} /><Text variant="small">Activo</Text></View><Button disabled={saving} onPress={save}><Save size={17} className="text-primary-foreground" /><Text>{saving ? 'Guardando...' : 'Guardar localmente'}</Text></Button></View>
      </View> : null}
      {error ? <Text className="text-sm text-destructive" role="alert">{error}</Text> : null}
      <NCrud title="RstBranch" rows={rows} columns={columns} loading={loading} searchPlaceholder="Nombre, dirección o encargado" searchText={(row) => `${row.BrhName} ${row.BrhAddress ?? ''} ${row.BrhManagerName ?? ''}`} onAdd={restaurantId ? beginAdd : undefined} onEdit={beginEdit} onDelete={remove} />
    </ScrollView></SafeAreaView>
  );
}
