import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { activateHeadlessScope } from '@/sync/headless';
import { pullNova } from '@/sync/pull';

export const NOVA_BACKGROUND_SYNC_TASK = 'nova-background-sync';

/**
 * Tarea en segundo plano del sistema operativo.
 *
 * Se define en el ámbito global del módulo porque el registro debe existir
 * antes de que la app vuelva a primer plano: el sistema puede lanzar la tarea
 * en un contexto de JavaScript frío, sin interfaz montada.
 *
 * En Android el sistema aplica la restricción de conectividad, de modo que la
 * tarea solo arranca con red. En iOS la ventana la decide el sistema: no hay
 * garantía de una cadencia concreta, y la cobertura fiable la dan el
 * planificador de primer plano y la recuperación de conectividad.
 */
if (Platform.OS !== 'web') {
  TaskManager.defineTask(NOVA_BACKGROUND_SYNC_TASK, async () => {
    try {
      const scope = await activateHeadlessScope();
      if (!scope) return BackgroundTask.BackgroundTaskResult.Success;
      await pullNova();
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

/**
 * Registra la tarea en segundo plano. Es opcional: si el sistema no la
 * admite, la app sigue sincronizando al volver a primer plano.
 */
export async function registerBackgroundSync(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(
      NOVA_BACKGROUND_SYNC_TASK,
    );
    if (registered) return true;
    await BackgroundTask.registerTaskAsync(NOVA_BACKGROUND_SYNC_TASK, {
      minimumInterval: 15,
    });
    return true;
  } catch {
    return false;
  }
}
