const mockDatabases = new Map<string, {
  name: string;
  values: Map<string, unknown>;
  localStorage: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<void>;
    remove: (key: string) => Promise<void>;
  };
}>();

const mockCreateDatabase = jest.fn((name: string) => {
  const values = new Map<string, unknown>();
  const database = {
    name,
    values,
    localStorage: {
      get: async (key: string) => values.get(key),
      set: async (key: string, value: unknown) => { values.set(key, value); },
      remove: async (key: string) => { values.delete(key); },
    },
  };
  mockDatabases.set(name, database);
  return database;
});

jest.mock('@/database/database', () => ({
  createDatabase: (name: string) => mockCreateDatabase(name),
}));
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: jest.fn(async (_algorithm: string, value: string) => value),
  Crypto: {
    CryptoDigestAlgorithm: { SHA256: 'SHA256' },
    digestStringAsync: jest.fn(async (_algorithm: string, value: string) => value),
  },
}));
jest.mock('@nozbe/watermelondb', () => ({
  localStorageKey: (key: string) => key,
}));

import * as manager from '@/database/manager';

beforeEach(() => {
  mockCreateDatabase.mockClear();
});

describe('account database selection', () => {
  test('separates servers and restores the same account database', async () => {
    const serverA = { BaseUrl: 'https://nova-a.example/api/', UsrID: 7, PrsID: 31 };
    const serverB = { BaseUrl: 'https://nova-b.example/api/', UsrID: 7, PrsID: 31 };

    const a = await manager.activateAccountDatabase(serverA, serverA);
    const b = await manager.activateAccountDatabase(serverB, serverB);
    const aAgain = await manager.activateAccountDatabase(serverA, serverA);

    expect(a.identityKey).not.toBe(b.identityKey);
    expect(a.database).not.toBe(b.database);
    expect(aAgain.database).toBe(a.database);
    expect(manager.getActiveDatabase()).toBe(a.database);
  });

  test('separates users and person scopes on the same server', async () => {
    const userA = { BaseUrl: 'https://nova.example/api', UsrID: 7, PrsID: 31 };
    const userB = { ...userA, UsrID: 8 };
    const otherPerson = { ...userA, PrsID: 32 };

    const a = await manager.activateAccountDatabase(userA, userA);
    const b = await manager.activateAccountDatabase(userB, userB);
    const person = await manager.activateAccountDatabase(otherPerson, otherPerson);

    expect(new Set([a.identityKey, b.identityKey, person.identityKey]).size).toBe(3);
    expect(new Set([a.database, b.database, person.database]).size).toBe(3);
  });

  test('adopts legacy storage only when saved scope and user prove ownership', async () => {
    const legacy = mockDatabases.get('nova-app') ?? mockCreateDatabase('nova-app');
    legacy.values.set('nova.sync.activeScope', 'https://nova.example/api|general|31|707');
    legacy.values.set('nova.sync.activeScopeUser', 707);
    const identity = { BaseUrl: 'https://nova.example/api/', UsrID: 707, PrsID: 31 };
    const selected = await manager.activateAccountDatabase(identity, identity);

    expect(selected.database).toBe(legacy);
    expect(legacy.values.get('nova.storage.owner')).toBe(selected.identityKey);
  });

  test('keeps an unattributable legacy database quarantined', async () => {
    const legacy = mockDatabases.get('nova-app')!;
    legacy.values.delete('nova.storage.owner');
    legacy.values.set('nova.sync.activeScope', 'scope-without-owner-proof');
    legacy.values.set('nova.sync.conflicts', [{ SyncId: 'legacy-fake' }]);
    const other = { BaseUrl: 'https://nova.example/api', UsrID: 808, PrsID: 31 };
    const selected = await manager.activateAccountDatabase(other, other);

    expect(selected.database).not.toBe(legacy);
    expect(legacy.values.get('nova.sync.conflicts.unassignedLegacy')).toEqual([
      { SyncId: 'legacy-fake' },
    ]);
    expect(legacy.values.has('nova.sync.conflicts')).toBe(false);
  });
});
