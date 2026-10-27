const mockDatabase = { localStorage: { get: jest.fn(), set: jest.fn() } };
const mockAuth = { Session: { User: { UsrID: 11 } } };

jest.mock('@/lib/api', () => ({ getForUser: jest.fn() }));
jest.mock('@/auth/store', () => ({ useAuthStore: { getState: () => mockAuth } }));
jest.mock('@/database', () => ({
  getActiveDatabase: () => mockDatabase,
  getActiveIdentityKey: () => 'account-a',
}));
jest.mock('@nozbe/watermelondb', () => ({ localStorageKey: (key: string) => key }));

import { getForUser } from '@/lib/api';
import { loadManagedImage } from '@/lib/managed-image';

beforeEach(() => jest.clearAllMocks());

test('caches an authenticated image in the current account database', async () => {
  jest.mocked(mockDatabase.localStorage.get).mockResolvedValueOnce(undefined);
  jest.mocked(getForUser).mockResolvedValueOnce({
    data: Uint8Array.from([1, 2, 3]).buffer,
    headers: { 'content-type': 'image/png' },
  } as never);
  const source = await loadManagedImage(152);
  expect(source).toBe('data:image/png;base64,AQID');
  expect(mockDatabase.localStorage.set).toHaveBeenCalledWith('nova.managedImage.152', source);
  jest.mocked(mockDatabase.localStorage.get).mockResolvedValueOnce(source);
  expect(await loadManagedImage(152)).toBe(source);
  expect(getForUser).toHaveBeenCalledTimes(1);
});

test('does not cache a non-image response', async () => {
  jest.mocked(mockDatabase.localStorage.get).mockResolvedValueOnce(undefined);
  jest.mocked(getForUser).mockResolvedValueOnce({
    data: new ArrayBuffer(0),
    headers: { 'content-type': 'text/html' },
  } as never);
  await expect(loadManagedImage(153)).rejects.toThrow('El archivo no tiene una vista previa de imagen.');
  expect(mockDatabase.localStorage.set).not.toHaveBeenCalled();
});
