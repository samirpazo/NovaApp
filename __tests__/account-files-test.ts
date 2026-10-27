jest.mock('expo-crypto', () => ({ randomUUID: () => 'fixture-id' }));
jest.mock('expo-file-system', () => ({
  Directory: class {},
  File: class {},
  Paths: { document: 'document://' },
}));
jest.mock('@/database', () => ({ getActiveIdentityKey: () => 'fake-account-hash' }));

import { toAccountDataUri } from '@/lib/account-files';

test('persists a browser file in the current database snapshot as data, not a transient blob URL', async () => {
  const file = new Blob([Uint8Array.from([1, 2, 3])], { type: 'image/png' });
  const stored = await toAccountDataUri({
    uri: 'blob:fixture-only',
    name: 'fixture.png',
    mimeType: 'image/png',
    file: file as File,
  });

  expect(stored.uri).toBe('data:image/png;base64,AQID');
  expect(stored).not.toHaveProperty('file');
  expect(stored.name).toBe('fixture.png');
});
