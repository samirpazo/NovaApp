import type { DirtyRaw } from '@nozbe/watermelondb';

import { isReadOnlyResource } from '@/contracts/sync';

/**
 * Resolvedor de conflictos de sincronización.
 *
 * En los recursos escribibles se conserva el cambio local y su SyncVersion, para
 * que NovaApi detecte la concurrencia y devuelva el conflicto al usuario.
 *
 * En los catálogos de solo lectura manda el servidor: la app móvil no los
 * edita, así que un resto local de una versión anterior se descarta y la fila
 * queda sincronizada con la versión oficial.
 */
export function resolveSyncConflict(
  table: string,
  local: DirtyRaw,
  remote: DirtyRaw,
  resolved: DirtyRaw,
): DirtyRaw {
  if (isReadOnlyResource(table)) {
    return {
      ...local,
      ...remote,
      id: local.id,
      _status: 'synced',
      _changed: '',
    };
  }
  if (local._status !== 'synced') resolved.SyncVersion = local.SyncVersion;
  return resolved;
}
