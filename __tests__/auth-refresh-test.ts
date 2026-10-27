jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));
jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn() },
  getApiErrorMessage: jest.fn(),
  setCsrfToken: jest.fn(),
}));
jest.mock('@/lib/security', () => ({ hashPassword: jest.fn() }));
jest.mock('@/lib/storage', () => ({
  storage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));
jest.mock('@/sync/config', () => ({
  clearAccessToken: jest.fn(),
  clearRefreshToken: jest.fn(),
  getAccessToken: jest.fn().mockResolvedValue(null),
  getRefreshToken: jest.fn().mockResolvedValue(null),
  saveAccessToken: jest.fn(),
  saveRefreshToken: jest.fn(),
}));

import { refreshSession } from '@/auth/service';
import { useAuthStore } from '@/auth/store';
import { api } from '@/lib/api';
import { storage } from '@/lib/storage';
import { saveAccessToken, saveRefreshToken } from '@/sync/config';

const session = {
  AccessTokenExpiration: '2026-10-26T10:15:00.000Z',
  SsnID: 1,
  User: { UsrID: 1, UsrName: 'admin' },
};

describe('renovación de sesión', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      Session: session,
      IsAuthenticated: true,
      IsLoading: false,
      IsReady: true,
      Error: null,
    });
  });

  test('comparte una única renovación entre llamadas concurrentes', async () => {
    jest.mocked(api.post).mockResolvedValue({
      data: { Succeeded: true, Message: null, Data: session },
      headers: {},
    });
    jest.mocked(api.get).mockResolvedValue({ data: { Data: 'csrf' } });

    const first = refreshSession();
    const second = refreshSession();

    expect(first).toBe(second);
    await Promise.all([first, second]);
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  test('no persiste tokens si la cuenta cambia mientras se renueva', async () => {
    jest.mocked(api.post).mockResolvedValue({
      data: { Succeeded: true, Message: null, Data: session },
      headers: {
        'set-cookie': [
          'nova_app_access_token=access',
          'nova_app_refresh_token=refresh',
        ],
      },
    });
    const isCurrent = jest
      .fn<Promise<boolean>, []>()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await expect(refreshSession(isCurrent, 'account-a')).rejects.toThrow(
      'La sesión cambió durante la renovación.',
    );

    expect(saveAccessToken).not.toHaveBeenCalled();
    expect(saveRefreshToken).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  test('guarda la sesión renovada en el estado autenticado antes del sync', async () => {
    const renewedSession = {
      ...session,
      AccessTokenExpiration: '2030-10-26T10:15:00.000Z',
    };
    jest.mocked(storage.getItem).mockResolvedValue(
      JSON.stringify({
        ...session,
        AccessTokenExpiration: '2020-01-01T00:00:00.000Z',
      }),
    );
    jest.mocked(api.post).mockResolvedValue({
      data: { Succeeded: true, Message: null, Data: renewedSession },
      headers: {},
    });
    jest.mocked(api.get).mockResolvedValue({ data: { Data: 'csrf' } });

    await useAuthStore.getState().ensureOnlineSession();

    expect(useAuthStore.getState().Session).toEqual(renewedSession);
    expect(api.post).toHaveBeenCalledWith('/Token/Refresh', {});
  });

  test('cierra la sesión local si el servidor rechaza definitivamente el refresh', async () => {
    jest.mocked(storage.getItem).mockResolvedValue(
      JSON.stringify({
        ...session,
        AccessTokenExpiration: '2020-01-01T00:00:00.000Z',
      }),
    );
    const unauthorized = Object.assign(new Error('Sesión inválida o expirada'), {
      isAxiosError: true,
      response: { status: 401 },
    });
    jest.mocked(api.post)
      .mockRejectedValueOnce(unauthorized)
      .mockRejectedValueOnce(new Error('El logout remoto no está disponible.'));

    await expect(useAuthStore.getState().ensureOnlineSession()).rejects.toBe(
      unauthorized,
    );

    expect(useAuthStore.getState().IsAuthenticated).toBe(false);
    expect(useAuthStore.getState().Session).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith('nova.auth.session');
  });

  test('conserva la sesión local si el refresh falla por red', async () => {
    jest.mocked(storage.getItem).mockResolvedValue(
      JSON.stringify({
        ...session,
        AccessTokenExpiration: '2020-01-01T00:00:00.000Z',
      }),
    );
    const networkError = Object.assign(new Error('network'), {
      isAxiosError: true,
    });
    jest.mocked(api.post).mockRejectedValue(networkError);

    await expect(useAuthStore.getState().ensureOnlineSession()).rejects.toBe(
      networkError,
    );

    expect(useAuthStore.getState().IsAuthenticated).toBe(true);
    expect(storage.removeItem).not.toHaveBeenCalled();
  });
});
