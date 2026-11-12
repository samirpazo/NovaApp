const mockFetchLocalChanges = jest.fn();

jest.mock('@nozbe/watermelondb/sync/impl/fetchLocal', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockFetchLocalChanges(...args),
}));

jest.mock('@/database', () => ({
  getActiveDatabase: () => mockDatabase,
}));

import { SYNC_RESOURCES } from '@/contracts/sync';
import {
  detectReadOnlyDrift,
  discardReadOnlyDrift,
  discardReadOnlyLeftovers,
  hasReadOnlyDrift,
} from '@/sync/read-only-discard';

const mockDatabase = {
  write: jest.fn(async (fn: () => Promise<void>) => fn()),
  batch: jest.fn(async () => undefined),
  get: jest.fn(() => ({
    find: jest.fn(async (id: string) => ({
      id,
      prepareDestroyPermanently: () => ({ id, prepared: 'destroy' }),
    })),
  })),
  adapter: {
    destroyDeletedRecords: jest.fn(async () => undefined),
  },
};

const raw = (id: string, status: string) => ({ id, _status: status });

describe('descarte de restos locales en catálogos de solo lectura', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('detecta restos heredados en las definiciones', async () => {
    mockFetchLocalChanges.mockResolvedValue({
      changes: {
        [SYNC_RESOURCES.GenDefinition]: {
          created: [raw('a', 'created')],
          updated: [raw('b', 'updated')],
          deleted: ['c'],
        },
        [SYNC_RESOURCES.OagTechnicalVisit]: {
          created: [raw('d', 'created')],
          updated: [],
          deleted: [],
        },
      },
    });

    const drift = await detectReadOnlyDrift();

    expect(hasReadOnlyDrift(drift)).toBe(true);
    expect(drift.resources).toEqual([SYNC_RESOURCES.GenDefinition]);
    expect(drift.created).toEqual([
      { resource: SYNC_RESOURCES.GenDefinition, id: 'a' },
    ]);
    expect(drift.updated).toEqual([
      { resource: SYNC_RESOURCES.GenDefinition, id: 'b' },
    ]);
    expect(drift.deleted).toEqual([
      { resource: SYNC_RESOURCES.GenDefinition, id: 'c' },
    ]);
  });

  it('ignora los restos de los recursos escribibles', async () => {
    mockFetchLocalChanges.mockResolvedValue({
      changes: {
        [SYNC_RESOURCES.OagTechnicalVisit]: {
          created: [raw('a', 'created')],
          updated: [raw('b', 'updated')],
          deleted: ['c'],
        },
      },
    });

    const drift = await detectReadOnlyDrift();

    expect(hasReadOnlyDrift(drift)).toBe(false);
    expect(drift.resources).toEqual([]);
  });

  it('elimina las filas creadas localmente y retira los borrados', async () => {
    const drift = {
      resources: [SYNC_RESOURCES.GenDefinition],
      created: [{ resource: SYNC_RESOURCES.GenDefinition, id: 'a' }],
      updated: [],
      deleted: [{ resource: SYNC_RESOURCES.GenDefinition, id: 'b' }],
    };

    await discardReadOnlyDrift(drift);

    expect(mockDatabase.batch).toHaveBeenCalledTimes(1);
    expect(mockDatabase.adapter.destroyDeletedRecords).toHaveBeenCalledWith(
      SYNC_RESOURCES.GenDefinition,
      ['b'],
    );
  });

  it('no toca la base cuando no hay restos', async () => {
    await discardReadOnlyDrift({
      resources: [],
      created: [],
      updated: [],
      deleted: [],
    });

    expect(mockDatabase.write).not.toHaveBeenCalled();
  });

  it('elimina las filas de solo lectura que el Pull no repuso', async () => {
    await discardReadOnlyLeftovers({
      [SYNC_RESOURCES.GenDefinition]: {
        created: [raw('a', 'created')],
        updated: [raw('b', 'updated')],
        deleted: [],
      },
      [SYNC_RESOURCES.OagTechnicalVisit]: {
        created: [raw('c', 'created')],
        updated: [],
        deleted: [],
      },
    } as never);

    expect(mockDatabase.batch).toHaveBeenCalledTimes(1);
    expect(mockDatabase.get).toHaveBeenCalledWith(SYNC_RESOURCES.GenDefinition);
  });

  it('no descarta restos cuando el Pull repuso el catálogo', async () => {
    await discardReadOnlyLeftovers({
      [SYNC_RESOURCES.GenDefinition]: {
        created: [],
        updated: [],
        deleted: [],
      },
    } as never);

    expect(mockDatabase.write).not.toHaveBeenCalled();
  });
});
