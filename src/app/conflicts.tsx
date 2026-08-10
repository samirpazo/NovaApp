import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowLeft, Cloud, RefreshCw, Smartphone } from 'lucide-react-native';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { SyncConflict } from '@/contracts/sync';
import { applyServerConflict, getSyncConflicts, keepLocalConflict, pullNova, useSyncConflictState } from '@/sync';

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Sin valor';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function changedFields(conflict: SyncConflict) {
  const local = conflict.LocalData ?? {};
  const ignored = new Set(['SyncId', 'SyncVersion', 'CreateDate', 'CreateUserId', 'UpdateDate', 'UpdateUserId', 'DeleteDate', 'DeleteUserId']);
  return [...new Set([...Object.keys(local), ...Object.keys(conflict.ServerData)])]
    .filter((field) => !ignored.has(field) && formatValue(local[field]) !== formatValue(conflict.ServerData[field]));
}

export default function ConflictsScreen() {
  const router = useRouter();
  const conflicts = useSyncConflictState((state) => state.Conflicts);
  const [busyKey, setBusyKey] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  useFocusEffect(React.useCallback(() => {
    void getSyncConflicts();
  }, []));

  const resolveWithServer = async (conflict: SyncConflict) => {
    const key = `${conflict.Resource}:${conflict.SyncId}`;
    setBusyKey(key);
    setError(null);
    try {
      await applyServerConflict(conflict);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo aplicar la versión del servidor.');
    } finally {
      setBusyKey(null);
    }
  };

  const resolveWithLocal = async (conflict: SyncConflict) => {
    const key = `${conflict.Resource}:${conflict.SyncId}`;
    setBusyKey(key);
    setError(null);
    try {
      await keepLocalConflict(conflict.Resource, conflict.SyncId);
      await pullNova();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo conservar la versión local.');
    } finally {
      await getSyncConflicts();
      setBusyKey(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="mx-auto w-full max-w-3xl gap-4 px-4 pb-24 pt-5">
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()} accessibilityLabel="Volver">
            <ArrowLeft size={20} />
          </Button>
          <View className="min-w-0 flex-1">
            <Text variant="title">Conflictos</Text>
            <Text variant="muted">{conflicts.length} pendiente{conflicts.length === 1 ? '' : 's'}</Text>
          </View>
          <Button variant="ghost" size="icon" onPress={() => void getSyncConflicts()} accessibilityLabel="Actualizar">
            <RefreshCw size={19} />
          </Button>
        </View>

        {error ? <Text className="text-sm text-destructive" role="alert">{error}</Text> : null}
        {!conflicts.length ? (
          <View className="items-center gap-2 border-y border-border py-10">
            <Cloud size={24} className="text-success" />
            <Text variant="heading">Sin conflictos pendientes</Text>
          </View>
        ) : conflicts.map((conflict) => {
          const key = `${conflict.Resource}:${conflict.SyncId}`;
          const fields = changedFields(conflict);
          return (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="text-base">{conflict.Resource}</CardTitle>
                <Text variant="caption" numberOfLines={1}>{conflict.SyncId}</Text>
              </CardHeader>
              <CardContent className="gap-4">
                <Text variant="small">{conflict.Message}</Text>
                {fields.map((field) => (
                  <View key={field} className="gap-2 border-t border-border pt-3">
                    <Text className="font-semibold">{field}</Text>
                    <View className="flex-row gap-3">
                      <View className="min-w-0 flex-1 gap-1">
                        <View className="flex-row items-center gap-1.5"><Smartphone size={14} /><Text variant="caption">Local</Text></View>
                        <Text variant="small">{formatValue(conflict.LocalData?.[field])}</Text>
                      </View>
                      <View className="min-w-0 flex-1 gap-1">
                        <View className="flex-row items-center gap-1.5"><Cloud size={14} /><Text variant="caption">Servidor</Text></View>
                        <Text variant="small">{formatValue(conflict.ServerData[field])}</Text>
                      </View>
                    </View>
                  </View>
                ))}
                <View className="flex-row flex-wrap gap-2 border-t border-border pt-4">
                  <Button className="min-w-36 flex-1" variant="outline" disabled={busyKey === key} onPress={() => void resolveWithServer(conflict)}>
                    <Cloud size={16} /><Text>Usar servidor</Text>
                  </Button>
                  <Button className="min-w-36 flex-1" disabled={busyKey === key} onPress={() => void resolveWithLocal(conflict)}>
                    <Smartphone size={16} /><Text>Conservar local</Text>
                  </Button>
                </View>
              </CardContent>
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
