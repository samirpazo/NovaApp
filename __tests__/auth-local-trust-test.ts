jest.mock('react-native', () => ({ Platform: { OS: 'native' } }));
jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn() },
  getApiErrorMessage: jest.fn((error: unknown) =>
    error instanceof Error ? error.message : 'error',
  ),
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
  getAccessToken: jest.fn().mockResolvedValue('access-token'),
  getRefreshToken: jest.fn().mockResolvedValue('refresh-token'),
  getDeviceToken: jest.fn().mockResolvedValue('nvd1.device-token'),
  saveAccessToken: jest.fn(),
  saveRefreshToken: jest.fn(),
  saveDeviceToken: jest.fn(),
}));

import { classifyAuthFailure, renewServerCredential } from '@/auth/service';
import { useAuthStore } from '@/auth/store';
import { api } from '@/lib/api';
import { storage } from '@/lib/storage';

const storedSession = {
  AccessTokenExpiration: '2020-01-01T00:00:00.000Z',
  SsnID: 1,
  User: { UsrID: 1, UsrName: 'tecnico' },
};

function axiosError(status?: number) {
  return Object.assign(new Error('request failed'), {
    isAxiosError: true,
    response: status ? { status } : undefined,
  });
}

describe('confianza local del dispositivo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(storage.getItem)
      .mockResolvedValue(JSON.stringify(storedSession));
    useAuthStore.setState({
      Session: null,
      IsAuthenticated: false,
      IsLoading: false,
      IsReady: false,
      Error: null,
      CredentialState: 'unknown',
      CredentialReason: null,
      SyncBlocked: false,
    });
  });

  test('arranca autenticada aunque el access token esté vencido', async () => {
    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState().IsAuthenticated).toBe(true);
    expect(useAuthStore.getState().Session?.User.UsrID).toBe(1);
    expect(useAuthStore.getState().IsReady).toBe(true);
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  test('no borra la sesión local cuando el servidor no responde', async () => {
    jest.mocked(api.post).mockRejectedValue(axiosError());

    await useAuthStore.getState().initialize();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(useAuthStore.getState().IsAuthenticated).toBe(true);
    expect(storage.removeItem).not.toHaveBeenCalledWith('nova.auth.session');
    expect(useAuthStore.getState().SyncBlocked).toBe(true);
  });

  test('usa la credencial de dispositivo cuando el refresh ya no sirve', async () => {
    jest.mocked(api.post).mockImplementation(((url: string) => {
      if (url === '/Token/Refresh') return Promise.reject(axiosError(401));
      if (url === '/Token/Session/Status')
        return Promise.resolve({
          data: {
            Succeeded: true,
            Message: null,
            Data: {
              Reason: 'session-expired',
              AccountActive: true,
              SessionValid: false,
              DeviceCredentialValid: true,
              SsnID: 0,
              UsrID: 1,
            },
          },
        });
      if (url === '/Token/DeviceToken/Exchange')
        return Promise.resolve({
          data: {
            Succeeded: true,
            Message: null,
            Data: {
              ...storedSession,
              SsnID: 55,
              AccessTokenExpiration: '2030-01-01T00:00:00.000Z',
            },
          },
          headers: {
            'set-cookie': [
              'nova_app_access_token=new-access',
              'nova_app_refresh_token=new-refresh',
            ],
          },
        });
      return Promise.resolve({ data: { Succeeded: true }, headers: {} });
    }) as never);

    const outcome = await renewServerCredential();

    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(outcome.session.SsnID).toBe(55);
    expect(api.post).toHaveBeenCalledWith('/Token/DeviceToken/Exchange', {
      DeviceToken: 'nvd1.device-token',
    });
  });

  test('clasifica la falta de red sin tocar la confianza local', async () => {
    const kind = await classifyAuthFailure(axiosError());
    expect(kind).toBe('offline');
  });

  test('clasifica un 5xx como error del servidor', async () => {
    const kind = await classifyAuthFailure(axiosError(503));
    expect(kind).toBe('server-error');
  });

  test('consulta al servidor para distinguir cuenta desactivada de sesión expirada', async () => {
    jest.mocked(api.post).mockResolvedValue({
      data: {
        Succeeded: true,
        Message: null,
        Data: {
          Reason: 'account-disabled',
          AccountActive: false,
          SessionValid: false,
          DeviceCredentialValid: true,
          SsnID: 0,
          UsrID: 1,
        },
      },
    });

    const kind = await classifyAuthFailure(axiosError(401));

    expect(kind).toBe('account-disabled');
    expect(api.post).toHaveBeenCalledWith('/Token/Session/Status', {
      RefreshToken: 'refresh-token',
      DeviceToken: 'nvd1.device-token',
    });
  });

  test('cierra la sesión local solo cuando el servidor revocó la confianza', async () => {
    jest.mocked(api.post).mockRejectedValue(axiosError(401));
    jest.mocked(api.post).mockImplementation(((url: string) => {
      if (url === '/Token/Session/Status')
        return Promise.resolve({
          data: {
            Succeeded: true,
            Message: null,
            Data: {
              Reason: 'device-revoked',
              AccountActive: true,
              SessionValid: false,
              DeviceCredentialValid: false,
              SsnID: 0,
              UsrID: 1,
            },
          },
        });
      return Promise.reject(axiosError(401));
    }) as never);

    const outcome = await renewServerCredential();

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.kind).toBe('device-revoked');
  });
});
