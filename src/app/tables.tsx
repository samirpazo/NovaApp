import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NCrud, type NCrudColumn, type NCrudRow } from '@/components/crud';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { SYNC_RESOURCES } from '@/contracts/sync';
import { database, RstTableModel } from '@/database';

interface TableRow extends NCrudRow { TabID: number; TabTableNumber: number; TabCapacity: number; TabStatus: number; BrhID: number | null; TabShape: string; }
const columns: NCrudColumn<TableRow>[] = [
  { key: 'TabID', title: 'ID', width: 70, align: 'right' }, { key: 'TabTableNumber', title: 'Mesa', width: 90, align: 'center' },
  { key: 'TabCapacity', title: 'Capacidad', width: 100, align: 'center' }, { key: 'TabStatus', title: 'Estado', width: 100, align: 'center' },
  { key: 'BrhID', title: 'Sucursal', width: 100, align: 'center' }, { key: 'TabShape', title: 'Forma', width: 140 },
];
const toRow = (model: RstTableModel): TableRow => ({ id: model.id, syncStatus: model.syncStatus, TabID: model.TabID, TabTableNumber: model.TabTableNumber, TabCapacity: model.TabCapacity, TabStatus: model.TabStatus, BrhID: model.BrhID, TabShape: model.TabShape });

export default function TablesScreen() {
  const router = useRouter();
  const [models, setModels] = React.useState<RstTableModel[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    const subscription = database.get<RstTableModel>(SYNC_RESOURCES.RstTable).query().observe().subscribe({ next: (records) => { setModels([...records].sort((a, b) => a.TabTableNumber - b.TabTableNumber)); setLoading(false); }, error: (reason) => { setError(reason instanceof Error ? reason.message : 'No se pudieron leer las mesas locales.'); setLoading(false); } });
    return () => subscription.unsubscribe();
  }, []);
  const rows = React.useMemo(() => models.map(toRow), [models]);
  return <SafeAreaView className="flex-1 bg-background"><ScrollView contentContainerClassName="mx-auto w-full max-w-6xl gap-4 px-4 pb-24 pt-4">
    <View className="flex-row items-center gap-3"><Button variant="ghost" size="icon" onPress={() => router.back()} accessibilityLabel="Volver"><ArrowLeft size={20} /></Button><View><Text variant="title">Mesas</Text><Text variant="caption">RstTable · consulta local</Text></View></View>
    {error ? <Text className="text-sm text-destructive" role="alert">{error}</Text> : null}
    <NCrud title="RstTable" rows={rows} columns={columns} loading={loading} readOnly searchPlaceholder="Número, capacidad o forma" searchText={(row) => `${row.TabTableNumber} ${row.TabCapacity} ${row.TabShape}`} />
  </ScrollView></SafeAreaView>;
}
