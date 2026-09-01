jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn() },
  getApiErrorMessage: jest.fn(),
}));

import { getNextThemeMode, resolveThemeMode } from '@/theme/appearance';

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
});
