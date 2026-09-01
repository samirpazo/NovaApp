import {
  isPendingNCrudStatus,
  resolveNCrudOfflineStatus,
} from '@/components/crud/n-crud-offline-state';

describe('NCrud offline state', () => {
  it('prioriza un conflicto sobre el estado local', () => {
    expect(
      resolveNCrudOfflineStatus({
        syncStatus: 'updated',
        hasConflict: true,
        isSyncing: true,
      }),
    ).toBe('conflict');
  });

  it('muestra sincronizando solo para cambios pendientes', () => {
    expect(
      resolveNCrudOfflineStatus({
        syncStatus: 'created',
        hasConflict: false,
        isSyncing: true,
      }),
    ).toBe('syncing');
    expect(
      resolveNCrudOfflineStatus({
        syncStatus: 'synced',
        hasConflict: false,
        isSyncing: true,
      }),
    ).toBe('synced');
  });

  it('reconoce estados pendientes de WatermelonDB', () => {
    expect(isPendingNCrudStatus('created')).toBe(true);
    expect(isPendingNCrudStatus('updated')).toBe(true);
    expect(isPendingNCrudStatus('deleted')).toBe(true);
    expect(isPendingNCrudStatus('synced')).toBe(false);
  });
});
