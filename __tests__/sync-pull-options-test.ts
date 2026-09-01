import { initialPullCursor } from '@/sync/pull-options';

describe('initialPullCursor', () => {
  test('keeps the incremental cursor during a normal synchronization', () => {
    expect(initialPullCursor(41, false)).toBe(40);
  });

  test('omits the cursor for an explicit complete server download', () => {
    expect(initialPullCursor(41, true)).toBeUndefined();
  });
});
