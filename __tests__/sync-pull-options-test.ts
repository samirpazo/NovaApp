import { pullCursors } from '@/sync/pull-options';

describe('pullCursors', () => {
  test('downloads journal changes, including deletions, before the complete snapshot', () => {
    expect(pullCursors(41, true)).toEqual([40, undefined]);
  });
  test('downloads one snapshot on the first synchronization', () => {
    expect(pullCursors(undefined, true)).toEqual([undefined]);
  });
  test('uses only incremental changes to reconcile an acknowledged Push', () => {
    expect(pullCursors(41, false)).toEqual([40]);
  });
});
