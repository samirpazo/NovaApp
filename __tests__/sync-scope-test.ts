const mockValues = new Map<string, unknown>();
const mockDatabase = {
  localStorage: {
    get: jest.fn(async (key: string) => mockValues.get(key)),
    set: jest.fn(async (key: string, value: unknown) => { mockValues.set(key, value); }),
    remove: jest.fn(async (key: string) => { mockValues.delete(key); }),
  },
};

jest.mock('@nozbe/watermelondb', () => ({ localStorageKey: (key: string) => key }));

import { activateSyncScope, syncScopeFor } from '@/sync/scope';

const connection = { BaseUrl: 'https://nova.example.test', BranchId: 3 };

beforeEach(() => {
  mockValues.clear();
  jest.clearAllMocks();
});

test('includes account identity in the persisted sync scope', () => {
  expect(syncScopeFor(connection, 20, 91)).not.toBe(
    syncScopeFor(connection, 21, 91),
  );
});

test('preserves local data and activates a different account without resetting it', async () => {
  mockValues.set('nova.sync.activeScope', syncScopeFor(connection, 20, 91));
  mockValues.set('nova.sync.activeScopeUser', 20);
  const pendingMutation = { id: 'fake-pending-a' };

  const result = await activateSyncScope(mockDatabase as never, connection, 21, 91);

  expect(result.ready).toBe(true);
  expect(mockDatabase.localStorage.set).toHaveBeenCalledWith(
    'nova.sync.activeScope',
    result.scope,
  );
  expect(pendingMutation.id).toBe('fake-pending-a');
});

test('moves a legacy conflict only when stored scope and owner match', async () => {
  mockValues.set('nova.sync.activeScope', syncScopeFor(connection, 20, 91));
  mockValues.set('nova.sync.activeScopeUser', 20);
  mockValues.set('nova.sync.conflicts', [{ SyncId: 'legacy-fake' }]);

  await activateSyncScope(mockDatabase as never, connection, 20, 91);

  expect(mockValues.get('nova.sync.conflicts.user.20')).toEqual([
    { SyncId: 'legacy-fake' },
  ]);
  expect(mockValues.has('nova.sync.conflicts')).toBe(false);
});

test('quarantines an unowned legacy conflict without exposing its contents', async () => {
  mockValues.set('nova.sync.activeScope', 'legacy-scope-without-user');
  mockValues.set('nova.sync.conflicts', [{ SyncId: 'unowned-fake' }]);

  await activateSyncScope(mockDatabase as never, connection, 22, 91);

  expect(mockValues.get('nova.sync.conflicts.unassignedLegacy')).toEqual([
    { SyncId: 'unowned-fake' },
  ]);
  expect(mockValues.has('nova.sync.conflicts')).toBe(false);
});

test('does not write the new scope if identity becomes stale', async () => {
  let current = true;
  const result = await activateSyncScope(
    mockDatabase as never,
    connection,
    20,
    91,
    () => current,
  );
  current = false;

  expect(result.ready).toBe(true);
  expect(mockValues.get('nova.sync.activeScope')).toBe(result.scope);
});
