import { SYNC_RESOURCES } from '@/contracts/sync';
import { resolveSyncConflict } from '@/sync/read-only-conflict';

const syncId = '683861b3-3bcd-4c2f-aff5-98d48ee3c048';

const local = {
  id: syncId,
  _status: 'updated',
  _changed: 'DefDescription',
  SyncId: syncId,
  SyncVersion: 'local',
  DefCode: 'TIPO',
  DefDescription: 'Descripción local',
};

const remote = {
  id: syncId,
  SyncId: syncId,
  SyncVersion: 'server',
  DefCode: 'TIPO',
  DefDescription: 'Descripción oficial',
};

/** Reproduce la resolución por columna de WatermelonDB antes del hook. */
function watermelonResolved() {
  const resolved = {
    ...local,
    ...remote,
    id: local.id,
    _status: local._status,
    _changed: local._changed,
  };
  local._changed.split(',').forEach((column) => {
    (resolved as Record<string, unknown>)[column] = (
      local as unknown as Record<string, unknown>
    )[column];
  });
  return resolved;
}

describe('resolución de conflictos de sincronización', () => {
  it('da prioridad al servidor en los catálogos de solo lectura', () => {
    const resolved = resolveSyncConflict(
      SYNC_RESOURCES.GenDefinition,
      local,
      remote,
      watermelonResolved(),
    );

    expect(resolved.DefDescription).toBe('Descripción oficial');
    expect(resolved.SyncVersion).toBe('server');
    expect(resolved._status).toBe('synced');
    expect(resolved._changed).toBe('');
    expect(resolved.id).toBe(syncId);
  });

  it('conserva la edición local en los recursos escribibles', () => {
    const resolved = resolveSyncConflict(
      SYNC_RESOURCES.OagTechnicalVisit,
      local,
      remote,
      watermelonResolved(),
    );

    expect(resolved.DefDescription).toBe('Descripción local');
    expect(resolved.SyncVersion).toBe('local');
    expect(resolved._status).toBe('updated');
  });

  it('no toca la versión local cuando la fila ya está sincronizada', () => {
    const synced = { ...local, _status: 'synced' as const, _changed: '' };
    const resolved = resolveSyncConflict(
      SYNC_RESOURCES.OagTechnicalVisit,
      synced,
      remote,
      { ...synced, ...remote },
    );

    expect(resolved.SyncVersion).toBe('server');
    expect(resolved._status).toBe('synced');
  });
});
