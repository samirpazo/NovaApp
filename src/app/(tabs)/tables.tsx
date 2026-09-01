import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NCrud, type NCrudColumn } from '@/components/crud';
import { Text } from '@/components/ui/text';
import { SYNC_RESOURCES } from '@/contracts/sync';
import {
  rstTableDataSource,
  type RstTableListItem,
} from '@/features/restaurant/tables';

const columns: NCrudColumn<RstTableListItem>[] = [
  { key: 'TabID', title: 'ID', width: 70, align: 'right' },
  {
    key: 'TabTableNumber',
    title: 'Mesa',
    width: 90,
    align: 'center',
    searchable: true,
  },
  { key: 'TabCapacity', title: 'Capacidad', width: 100, align: 'center' },
  { key: 'TabStatus', title: 'Estado', width: 100, align: 'center' },
  { key: 'BrhID', title: 'Sucursal', width: 100, align: 'center' },
  { key: 'TabShape', title: 'Forma', width: 140, searchable: true },
];
export default function TablesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="mx-auto w-full max-w-6xl gap-4 pb-24 pt-4">
        <View>
          <Text variant="title">Mesas</Text>
          <Text variant="caption">RstTable · consulta local</Text>
        </View>
        <NCrud
          title="RstTable"
          authorization={{ optCode: 'RST_TABLE' }}
          offline={{ resource: SYNC_RESOURCES.RstTable }}
          persistenceKey="rst-tables"
          dataSource={rstTableDataSource}
          columns={columns}
          readOnly
          toolbar={{ export: true }}
          searchPlaceholder="Forma de mesa"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
