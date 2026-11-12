declare const __dirname: string;
declare function require(name: string): {
  readFileSync?: (path: string, encoding: string) => string;
  resolve?: (...paths: string[]) => string;
  join?: (...paths: string[]) => string;
};

const fs = require('fs') as Required<
  Pick<ReturnType<typeof require>, 'readFileSync'>
>;
const path = require('path') as Required<
  Pick<ReturnType<typeof require>, 'resolve' | 'join'>
>;

const appRoot = path.resolve(__dirname, '..');
const read = (relativePath: string) =>
  fs.readFileSync(path.join(appRoot, relativePath), 'utf8');

const mockDatabaseCalls = {
  activateAccountDatabase: jest.fn(),
  deactivateAccountDatabase: jest.fn(),
};

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn().mockResolvedValue({ data: {} }) },
  getApiErrorMessage: jest.fn(),
  setCsrfToken: jest.fn(),
}));
jest.mock('@/lib/storage', () => ({
  storage: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('@/sync/config', () => ({
  clearAccessToken: jest.fn(),
  clearRefreshToken: jest.fn(),
  clearDeviceToken: jest.fn(),
  getAccessToken: jest.fn().mockResolvedValue(null),
  getRefreshToken: jest.fn().mockResolvedValue(null),
  getDeviceToken: jest.fn().mockResolvedValue(null),
  saveAccessToken: jest.fn(),
  saveRefreshToken: jest.fn(),
  saveDeviceToken: jest.fn(),
}));
jest.mock('@/database', () => mockDatabaseCalls);

import { useAuthStore } from '@/auth/store';
import { storage } from '@/lib/storage';
import {
  clearAccessToken,
  clearDeviceToken,
  clearRefreshToken,
} from '@/sync/config';

describe('durabilidad de los datos locales', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('cerrar sesión borra la credencial pero no toca el almacenamiento local', async () => {
    useAuthStore.setState({
      Session: {
        AccessTokenExpiration: '2030-01-01T00:00:00.000Z',
        SsnID: 1,
        User: { UsrID: 1, UsrName: 'tecnico' },
      },
      IsAuthenticated: true,
      IsReady: true,
    });

    await useAuthStore.getState().signOut();

    // La credencial del servidor se elimina por completo.
    expect(storage.removeItem).toHaveBeenCalledWith('nova.auth.session');
    expect(clearAccessToken).toHaveBeenCalled();
    expect(clearRefreshToken).toHaveBeenCalled();
    expect(clearDeviceToken).toHaveBeenCalled();

    // El almacenamiento local de la cuenta no se destruye: las visitas
    // capturadas sin conexión siguen en el dispositivo.
    expect(mockDatabaseCalls.deactivateAccountDatabase).not.toHaveBeenCalled();
    expect(mockDatabaseCalls.activateAccountDatabase).not.toHaveBeenCalled();
    expect(useAuthStore.getState().IsAuthenticated).toBe(false);
  });

  test('el código de sesión nunca destruye el almacenamiento local', () => {
    const guarded = [
      'src/auth/store.ts',
      'src/auth/service.ts',
      'src/database/manager.ts',
    ];

    for (const file of guarded) {
      const source = read(file);
      expect(source).not.toContain('unsafeResetDatabase');
      expect(source).not.toContain('destroyPermanently');
      expect(source).not.toContain('deleteDatabase');
    }
  });
});
