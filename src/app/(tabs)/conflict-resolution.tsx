import { useFocusEffect, useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cloud,
  RefreshCw,
  Smartphone,
} from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConflictComparison } from '@/components/sync/conflict-comparison';
import { Text } from '@/components/ui/text';
import {
  SyncConflictResolutionSchema,
  type SyncConflict,
} from '@/contracts/sync';
import {
  getSyncConflicts,
  pullNova,
  resolveSyncConflict,
  useSyncConflictState,
} from '@/sync';

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Sin valor';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function fieldRecord(value: object | null): Record<string, unknown> {
  return value ? Object.fromEntries(Object.entries(value)) : {};
}

function changedFields(conflict: SyncConflict) {
  const local = fieldRecord(conflict.LocalData);
  const server = fieldRecord(conflict.ServerData);
  const ignored = new Set([
    'SyncId',
    'SyncVersion',
    'CreateDate',
    'CreateUserId',
    'UpdateDate',
    'UpdateUserId',
    'DeleteDate',
    'DeleteUserId',
  ]);
  return [...new Set([...Object.keys(local), ...Object.keys(server)])].filter(
    (field) =>
      !ignored.has(field) &&
      formatValue(local[field]) !== formatValue(server[field]),
  );
}

export default function ConflictsScreen() {
  const router = useRouter();
  const conflicts = useSyncConflictState((state) => state.Conflicts);
  const [busyKey, setBusyKey] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      void getSyncConflicts();
    }, []),
  );

  const resolveWithServer = async (conflict: SyncConflict) => {
    const key = `${conflict.Resource}:${conflict.SyncId}`;
    setBusyKey(key);
    setError(null);
    try {
      await resolveSyncConflict(
        conflict,
        SyncConflictResolutionSchema.parse({
          Decision: 'UseServer',
          Resource: conflict.Resource,
          SyncId: conflict.SyncId,
        }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo aplicar la versión del servidor.',
      );
    } finally {
      setBusyKey(null);
    }
  };

  const resolveWithLocal = async (conflict: SyncConflict) => {
    const key = `${conflict.Resource}:${conflict.SyncId}`;
    setBusyKey(key);
    setError(null);
    try {
      await resolveSyncConflict(
        conflict,
        SyncConflictResolutionSchema.parse({
          Decision: 'KeepLocal',
          Resource: conflict.Resource,
          SyncId: conflict.SyncId,
        }),
      );
      await pullNova();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo conservar la versión local.',
      );
    } finally {
      await getSyncConflicts();
      setBusyKey(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="mx-auto w-full max-w-4xl gap-3 pb-24 pt-4">
        <View className="flex-row items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onPress={() => router.replace('/(tabs)/conflicts')}
            accessibilityLabel="Volver a conflictos"
          >
            <ArrowLeft
              size={18}
              className="text-foreground"
            />
          </Button>
          <View className="min-w-0 flex-1">
            <Text className="text-lg font-poppins-semibold">
              Resolver conflictos
            </Text>
            <Text variant="caption">
              {conflicts.length} decisión{conflicts.length === 1 ? '' : 'es'}{' '}
              pendiente{conflicts.length === 1 ? '' : 's'}
            </Text>
          </View>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onPress={() => void getSyncConflicts()}
            accessibilityLabel="Actualizar"
          >
            <RefreshCw
              size={17}
              className="text-foreground"
            />
          </Button>
        </View>

        {error ? (
          <View
            className="flex-row items-start gap-2 rounded-md bg-destructive/10 px-3 py-2"
            role="alert"
          >
            <AlertTriangle
              size={15}
              className="mt-0.5 text-destructive"
            />
            <Text className="min-w-0 flex-1 text-xs text-destructive">
              {error}
            </Text>
          </View>
        ) : null}
        {!conflicts.length ? (
          <View className="flex-row items-center gap-3 border-y border-border py-4">
            <CheckCircle2
              size={18}
              className="text-success"
            />
            <View className="gap-0.5">
              <Text className="text-xs font-poppins-semibold">
                Todo está resuelto
              </Text>
              <Text variant="caption">
                Los datos locales y del servidor ya no requieren decisiones.
              </Text>
            </View>
          </View>
        ) : (
          conflicts.map((conflict) => {
            const key = `${conflict.Resource}:${conflict.SyncId}`;
            const fields = changedFields(conflict);
            return (
              <Card
                key={key}
                className="overflow-hidden p-0"
              >
                <View className="gap-1.5 border-b border-border bg-muted/35 p-4">
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="text-sm font-poppins-semibold">
                      {conflict.Resource}
                    </Text>
                    <View className="flex-row items-center gap-1.5 rounded-md bg-warning/10 px-2.5 py-1.5">
                      <AlertTriangle
                        size={13}
                        className="text-warning"
                      />
                      <Text className="text-xs font-poppins-semibold text-warning">
                        Requiere decisión
                      </Text>
                    </View>
                  </View>
                  <Text
                    className="text-xs text-muted-foreground"
                    numberOfLines={1}
                    selectable
                  >
                    {conflict.SyncId}
                  </Text>
                </View>

                <View className="px-4 py-4">
                  <Text className="text-sm leading-5">{conflict.Message}</Text>
                  <View className="mt-3">
                    {fields.map((field) => (
                      <ConflictComparison
                        key={field}
                        field={field}
                        localValue={formatValue(
                          fieldRecord(conflict.LocalData)[field],
                        )}
                        serverValue={formatValue(
                          fieldRecord(conflict.ServerData)[field],
                        )}
                      />
                    ))}
                  </View>
                </View>

                <View className="gap-3 border-t border-border bg-muted/20 p-4 md:flex-row">
                  <Button
                    className="min-h-10 flex-1 px-3 py-2"
                    variant="outline"
                    disabled={busyKey === key}
                    onPress={() => void resolveWithServer(conflict)}
                  >
                    {busyKey === key ? (
                      <ActivityIndicator size="small" />
                    ) : (
                      <Cloud
                        size={16}
                        className="text-foreground"
                      />
                    )}
                    <Text className="text-sm">Usar versión del servidor</Text>
                  </Button>
                  <Button
                    className="min-h-10 flex-1 px-3 py-2"
                    disabled={busyKey === key}
                    onPress={() => void resolveWithLocal(conflict)}
                  >
                    {busyKey === key ? (
                      <ActivityIndicator
                        size="small"
                        color="white"
                      />
                    ) : (
                      <Smartphone
                        size={16}
                        className="text-primary-foreground"
                      />
                    )}
                    <Text className="text-sm">Mantener mi cambio</Text>
                  </Button>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
