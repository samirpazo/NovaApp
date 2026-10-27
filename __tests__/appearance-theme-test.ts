jest.mock('@/lib/api', () => {
  const post = jest.fn();
  return {
    api: { get: jest.fn(), post },
    getApiErrorMessage: jest.fn(),
    getForUser: jest.fn(),
    postForUser: jest.fn((url: string, data: unknown, userId: number, config: object, identityKey: string) =>
      post(url, data, { ...config, _novaUserId: userId, _novaIdentityKey: identityKey }),
    ),
  };
});
jest.mock('@/database', () => ({ getActiveIdentityKey: () => 'account-a' }));
const mockStorageValues = new Map<string, string>();
jest.mock('@/lib/storage', () => ({
  storage: {
    getItem: jest.fn(async (key: string) => mockStorageValues.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorageValues.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockStorageValues.delete(key);
    }),
  },
}));

import { api } from '@/lib/api';
import {
  flushPendingAppearance,
  getNextThemeMode,
  resolveThemeMode,
  saveOrQueueAppearance,
  useAppearanceStore,
} from '@/theme/appearance';

async function waitForApiCalls(count: number): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (jest.mocked(api.post).mock.calls.length >= count) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

beforeEach(() => {
  mockStorageValues.clear();
  jest.mocked(api.post).mockReset();
  useAppearanceStore.setState({
    userId: 11,
    identityKey: 'account-a',
    preferences: { Theme: 'system', PrimaryColor: '#002aff', HeaderColor: '#002aff' },
    preview: { Theme: 'system', PrimaryColor: '#002aff', HeaderColor: '#002aff' },
    revision: 0,
    ready: true,
  });
});

describe('appearance theme mode', () => {
  test('accepts the three supported preferences', () => {
    expect(resolveThemeMode('light')).toBe('light');
    expect(resolveThemeMode('dark')).toBe('dark');
    expect(resolveThemeMode('system')).toBe('system');
  });

  test('uses the system preference for absent or legacy values', () => {
    expect(resolveThemeMode(undefined)).toBe('system');
    expect(resolveThemeMode(null)).toBe('system');
    expect(resolveThemeMode('auto')).toBe('system');
  });

  test('cycles the quick toggle through light, dark and system', () => {
    expect(getNextThemeMode('light')).toBe('dark');
    expect(getNextThemeMode('dark')).toBe('system');
    expect(getNextThemeMode('system')).toBe('light');
  });

  test('keeps queued appearance for its owner when another account signs in', async () => {
    jest.mocked(api.post).mockRejectedValue(new Error('offline'));
    const preference = {
      Theme: 'dark' as const,
      PrimaryColor: '#10b981',
      HeaderColor: '#002aff',
    };
    expect(await saveOrQueueAppearance(preference)).toBe('pending');
    const accountAQueue = mockStorageValues.get(
      'nova.appearance.pending.account.account-a',
    );

    useAppearanceStore.setState({ userId: 22, identityKey: 'account-b' });
    expect(await flushPendingAppearance()).toBe(true);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(
      mockStorageValues.get('nova.appearance.pending.account.account-a'),
    ).toBe(accountAQueue);
  });

  test('hydrates and persists appearance in the matching account namespace', async () => {
    mockStorageValues.set(
      'nova.appearance.account.account-a',
      JSON.stringify({ Theme: 'dark', PrimaryColor: '#06b6d4' }),
    );
    mockStorageValues.set(
      'nova.appearance.account.account-b',
      JSON.stringify({ Theme: 'light', PrimaryColor: '#e11d48' }),
    );

    await useAppearanceStore.getState().hydrate(22, 'account-b');

    expect(useAppearanceStore.getState().preferences.Theme).toBe('light');
    await useAppearanceStore.getState().commit({
      Theme: 'dark',
      PrimaryColor: '#10b981',
    });
    expect(
      JSON.parse(mockStorageValues.get('nova.appearance.account.account-b') ?? '{}'),
    ).toMatchObject({ Theme: 'dark', PrimaryColor: '#10b981' });
    expect(
      JSON.parse(mockStorageValues.get('nova.appearance.account.account-a') ?? '{}'),
    ).toMatchObject({ Theme: 'dark', PrimaryColor: '#06b6d4' });
  });

  test('does not load an unowned legacy preference when no account is active', async () => {
    mockStorageValues.set(
      'nova.appearance',
      JSON.stringify({ Theme: 'dark', PrimaryColor: '#e11d48' }),
    );

    await useAppearanceStore.getState().hydrate(null);

    expect(useAppearanceStore.getState().preferences.Theme).toBe('system');
    expect(useAppearanceStore.getState().userId).toBeNull();
  });

  test('does not delete a newer queue value while an older value is being flushed', async () => {
    let completePost!: () => void;
    jest.mocked(api.post).mockImplementation(
      () =>
        new Promise((resolve) => {
          completePost = () =>
            resolve({
              data: {
                Succeeded: true,
                Message: null,
                Data: {
                  Theme: 'dark',
                  PrimaryColor: '#10b981',
                  HeaderColor: '#002aff',
                },
              },
            });
        }) as never,
    );
    const first = JSON.stringify({ Theme: 'dark', PrimaryColor: '#10b981' });
    const second = JSON.stringify({ Theme: 'light', PrimaryColor: '#e11d48' });
    mockStorageValues.set('nova.appearance.pending.account.account-a', first);

    const flushing = flushPendingAppearance(11);
    await waitForApiCalls(1);
    mockStorageValues.set('nova.appearance.pending.account.account-a', second);
    completePost();

    expect(await flushing).toBe(true);
    expect(mockStorageValues.get('nova.appearance.pending.account.account-a')).toBe(second);
  });

  test('sends same-account preference updates in order', async () => {
    const first = {
      Theme: 'dark' as const,
      PrimaryColor: '#10b981',
      HeaderColor: '#002aff',
    };
    const second = {
      Theme: 'light' as const,
      PrimaryColor: '#e11d48',
      HeaderColor: '#002aff',
    };
    let finishFirst!: () => void;
    let finishSecond!: () => void;
    let secondStarted!: () => void;
    const startedSecond = new Promise<void>((resolve) => {
      secondStarted = resolve;
    });
    const response = (preferences: typeof first | typeof second) => ({
      data: { Succeeded: true, Message: null, Data: preferences },
    });
    jest
      .mocked(api.post)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishFirst = () => resolve(response(first));
          }) as never,
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            secondStarted();
            finishSecond = () => resolve(response(second));
          }) as never,
      );

    const savingFirst = saveOrQueueAppearance(first, 11);
    await waitForApiCalls(1);
    expect(api.post).toHaveBeenCalledTimes(1);
    const savingSecond = saveOrQueueAppearance(second, 11);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(api.post).toHaveBeenCalledTimes(1);

    finishFirst();
    await savingFirst;
    await startedSecond;
    expect(api.post).toHaveBeenCalledTimes(2);
    finishSecond();
    await savingSecond;

    expect(api.post).toHaveBeenNthCalledWith(
      2,
      '/SecUserPreference/Save',
      second,
      { _novaUserId: 11, _novaIdentityKey: 'account-a' },
    );
    expect(mockStorageValues.has('nova.appearance.pending.account.account-a')).toBe(false);
  });
});
