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
  clearDeviceToken: jest.fn(),
  getAccessToken: jest.fn().mockResolvedValue(null),
  getRefreshToken: jest.fn().mockResolvedValue(null),
  getDeviceToken: jest.fn().mockResolvedValue(null),
  saveAccessToken: jest.fn(),
  saveRefreshToken: jest.fn(),
  saveDeviceToken: jest.fn(),
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
      CredentialState: 'unknown',
      CredentialReason: null,
      SyncBlocked: false,
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

  test('una renovación tardía de A no reemplaza el inicio de sesión de B', async () => {
    const accountA = {
      ...session,
      AccessTokenExpiration: '2020-01-01T00:00:00.000Z',
      User: { UsrID: 11, UsrName: 'account-a' },
    };
    const accountB = {
      AccessTokenExpiration: '2030-01-01T00:00:00.000Z',
      SsnID: 2,
      User: { UsrID: 22, UsrName: 'account-b' },
    };
    useAuthStore.setState({
      Session: accountA,
      IsAuthenticated: true,
      IsLoading: false,
      IsReady: true,
      Error: null,
    });
    jest.mocked(storage.getItem).mockResolvedValue(JSON.stringify(accountA));
    let releaseRefresh!: (response: unknown) => void;
    let signalRefresh!: () => void;
    const refreshStarted = new Promise<void>((resolve) => {
      signalRefresh = resolve;
    });
    const delayedRefresh = new Promise<unknown>((resolve) => {
      releaseRefresh = resolve;
    });
    jest.mocked(api.post).mockImplementation(((url: string) => {
      if (url === '/Token/Refresh') {
        signalRefresh();
        return delayedRefresh;
      }
      if (url === '/Token')
        return Promise.resolve({
          data: { Succeeded: true, Message: null, Data: accountB },
          headers: {},
        });
      return Promise.resolve({ data: { Succeeded: true }, headers: {} });
    }) as never);
    jest.mocked(api.get).mockResolvedValue({ data: { Data: 'csrf-b' } });

    const pendingRefresh = useAuthStore
      .getState()
      .resolveServerCredential();
    await refreshStarted;
    await useAuthStore.getState().signIn('account-b', 'fictional-password');
    releaseRefresh({
      data: { Succeeded: true, Message: null, Data: accountA },
      headers: {},
    });

    await expect(pendingRefresh).rejects.toThrow('La sesión cambió');
    expect(useAuthStore.getState().Session).toEqual(accountB);
    expect(useAuthStore.getState().IsAuthenticated).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(
      'nova.auth.session',
      JSON.stringify(accountB),
    );
    expect(storage.removeItem).not.toHaveBeenCalled();
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

    await useAuthStore.getState().resolveServerCredential();

    expect(useAuthStore.getState().Session).toEqual(renewedSession);
    expect(api.post).toHaveBeenCalledWith('/Token/Refresh', {});
  });

  test('conserva la sesión local si el servidor rechaza definitivamente el refresh', async () => {
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
      .mockRejectedValueOnce(new Error('El logout remoto no está disponible.'))
      .mockRejectedValue(new Error('Sin estado de sesión.'));

    await expect(
      useAuthStore.getState().resolveServerCredential(),
    ).rejects.toThrow();

    // La confianza local sobrevive: el dispositivo conserva el acceso a los
    // datos locales aunque el servidor ya no renueve la credencial.
    expect(useAuthStore.getState().IsAuthenticated).toBe(true);
    expect(useAuthStore.getState().Session).not.toBeNull();
    expect(storage.removeItem).not.toHaveBeenCalledWith('nova.auth.session');
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

    await expect(
      useAuthStore.getState().resolveServerCredential(),
    ).rejects.toThrow();

    expect(useAuthStore.getState().IsAuthenticated).toBe(true);
    expect(storage.removeItem).not.toHaveBeenCalled();
  });
});
