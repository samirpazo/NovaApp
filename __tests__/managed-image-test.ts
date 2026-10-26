import { loadManagedImage } from '@/lib/managed-image';
import { api } from '@/lib/api';
import { database } from '@/database';

jest.mock('@/lib/api', () => ({ api: { get: jest.fn() } }));
jest.mock('@/database', () => ({ database: { localStorage: { get: jest.fn(), set: jest.fn() } } }));
jest.mock('@nozbe/watermelondb', () => ({ localStorageKey: (key: string) => key }));

beforeEach(() => jest.clearAllMocks());

test('an authenticated image is cached and remains readable without another network request', async () => {
  jest.mocked(database.localStorage.get).mockResolvedValueOnce(undefined);
  jest.mocked(api.get).mockResolvedValueOnce({
    data: Uint8Array.from([1, 2, 3]).buffer,
    headers: { 'content-type': 'image/png' },
  });
  const source = await loadManagedImage(152);
  expect(source).toBe('data:image/png;base64,AQID');
  expect(database.localStorage.set).toHaveBeenCalledWith('nova.managedImage.152', source);
  jest.mocked(database.localStorage.get).mockResolvedValueOnce(source);
  expect(await loadManagedImage(152)).toBe(source);
  expect(api.get).toHaveBeenCalledTimes(1);
});

test('an unexpected document response is not cached as a signature image', async () => {
  jest.mocked(database.localStorage.get).mockResolvedValueOnce(undefined);
  jest.mocked(api.get).mockResolvedValueOnce({ data: new ArrayBuffer(0), headers: { 'content-type': 'text/html' } });
  await expect(loadManagedImage(153)).rejects.toThrow('El archivo no tiene una vista previa de imagen.');
  expect(database.localStorage.set).not.toHaveBeenCalled();
});
