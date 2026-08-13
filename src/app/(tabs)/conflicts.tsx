import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { getSyncConflicts, useSyncConflictState } from '@/sync';
import { useFocusEffect, useRouter } from 'expo-router';
import { CheckCircle2, ChevronRight, GitCompareArrows } from 'lucide-react-native';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

export default function ConflictsTab() {
  const router = useRouter();
  const conflicts = useSyncConflictState((state) => state.Conflicts);

  useFocusEffect(
    React.useCallback(() => {
      void getSyncConflicts();
    }, []),
  );

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="mx-auto w-full max-w-3xl gap-3 px-4 pb-20 pt-4">
      <View className="gap-0.5">
        <Text className="text-lg font-poppins-semibold">Conflictos</Text>
        <Text variant="caption">Cambios que requieren una decisión</Text>
      </View>
      {!conflicts.length ? (
        <View className="flex-row items-center gap-3 border-y border-border py-4">
          <CheckCircle2 size={18} className="text-success" />
          <View className="gap-0.5">
            <Text className="text-xs font-poppins-semibold">Todo está resuelto</Text>
            <Text variant="caption">No hay decisiones de sincronización pendientes.</Text>
          </View>
        </View>
      ) : (
        <Button className="min-h-14 justify-start gap-2.5 px-3 py-2.5" variant="outline" onPress={() => router.push('/conflict-resolution')}>
          <View className="h-8 w-8 items-center justify-center rounded-md bg-warning/10">
            <GitCompareArrows size={17} className="text-warning" />
          </View>
          <View className="min-w-0 flex-1 items-start gap-0.5">
            <Text className="text-sm font-poppins-semibold">Resolver conflictos</Text>
            <Text className="text-xs text-muted-foreground">{conflicts.length} pendiente{conflicts.length === 1 ? '' : 's'}</Text>
          </View>
          <ChevronRight size={17} className="text-muted-foreground" />
        </Button>
      )}
    </ScrollView>
  );
}
