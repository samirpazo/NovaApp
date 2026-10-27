const mockValues = new Map<string, unknown>();
const mockAuth = {
  Session: { User: { UsrID: 11 } },
};
const mockDatabase = {
  localStorage: {
    get: jest.fn(async (key: string) => mockValues.get(key)),
    set: jest.fn(async (key: string, value: unknown) => { mockValues.set(key, value); }),
  },
  get: jest.fn(),
  write: jest.fn(),
  batch: jest.fn(),
};

jest.mock('@/auth/store', () => ({
  useAuthStore: { getState: () => mockAuth },
}));
jest.mock('@/database', () => ({
  getActiveDatabase: () => mockDatabase,
}));

import {
  getSyncConflicts,
  saveSyncConflicts,
  useSyncConflictState,
} from '@/sync/conflicts';
import type { SyncConflict } from '@/contracts/sync';

const conflict: SyncConflict = {
  Resource: 'GenDefinition',
  SyncId: '330c90ee-184c-42e5-9fb7-93f177901c20',
  Operation: 'U',
  Message: 'conflicto ficticio',
  LocalData: {
    SyncId: '330c90ee-184c-42e5-9fb7-93f177901c20',
    SyncVersion: 'local',
    SecStatus: true,
    CreateUserId: 11,
    UpdateUserId: 11,
    DeleteUserId: null,
    CreateDate: '2026-01-01T00:00:00Z',
    UpdateDate: null,
    DeleteDate: null,
    DefID: -1,
    DefDescription: 'solo fake A',
    DefCode: 'FAKE_A',
    DefStated: 1,
  },
  ServerData: {
    SyncId: '330c90ee-184c-42e5-9fb7-93f177901c20',
    SyncVersion: 'server',
    SecStatus: true,
    CreateUserId: 11,
    UpdateUserId: 11,
    DeleteUserId: null,
    CreateDate: '2026-01-01T00:00:00Z',
    UpdateDate: null,
    DeleteDate: null,
    DefID: 1,
    DefDescription: 'solo fake A',
    DefCode: 'FAKE_A',
    DefStated: 1,
  },
  KeepLocal: false,
  DetectedAt: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  mockValues.clear();
  mockAuth.Session = { User: { UsrID: 11 } };
  useSyncConflictState.getState().setConflicts([]);
});

test('does not expose account A conflict to account B and restores it to A', async () => {
  await saveSyncConflicts([conflict]);
  expect(mockValues.has('nova.sync.conflicts.user.11')).toBe(true);

  mockAuth.Session = { User: { UsrID: 22 } };
  expect(await getSyncConflicts()).toEqual([]);
  expect(useSyncConflictState.getState().Conflicts).toEqual([]);

  mockAuth.Session = { User: { UsrID: 11 } };
  expect(await getSyncConflicts()).toEqual([conflict]);
});
