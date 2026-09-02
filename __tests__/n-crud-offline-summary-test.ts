import type { SyncConflict } from '@/contracts/sync';
import {
  filterResourceConflicts,
  selectSyncConflicts,
} from '@/components/crud/n-crud-offline-selectors';

describe('NCrud offline summary selectors', () => {
  const conflicts = [
    { Resource: 'GenDefinition' },
    { Resource: 'RstBranch' },
  ] as SyncConflict[];

  it('returns the stable conflicts reference from the Zustand snapshot', () => {
    const state = { Conflicts: conflicts };

    expect(selectSyncConflicts(state)).toBe(conflicts);
    expect(selectSyncConflicts(state)).toBe(selectSyncConflicts(state));
  });

  it('filters conflicts by resource outside the Zustand selector', () => {
    expect(filterResourceConflicts(conflicts, 'GenDefinition')).toEqual([
      conflicts[0],
    ]);
  });
});
