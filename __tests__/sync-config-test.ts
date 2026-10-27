import { isConfiguredApiConnection } from '@/sync/config';

describe('conexión de sincronización', () => {
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = originalUrl;
  });

  test('acepta la URL de servidor configurada aunque cambien mayúsculas y slash final', () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test/nova/';

    expect(
      isConfiguredApiConnection({
        BaseUrl: 'https://API.example.test/nova',
      }),
    ).toBe(true);
  });

  test('rechaza una URL guardada que enviaría tokens a otro servidor', () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';

    expect(
      isConfiguredApiConnection({ BaseUrl: 'https://other.example.test' }),
    ).toBe(false);
  });
});
