import * as Location from 'expo-location';
import { technicalVisitLocation } from '@/lib/technical-visit-location';

jest.mock('expo-location', () => ({
  Accuracy: { High: 4 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

test('does not read GPS without permission', async () => {
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({
      granted: false,
    } as Location.LocationPermissionResponse);
  await expect(technicalVisitLocation()).rejects.toThrow('Permite el acceso');
  expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
});

test('uses fresh signed coordinates from the device', async () => {
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({
      granted: true,
    } as Location.LocationPermissionResponse);
  jest
    .mocked(Location.getCurrentPositionAsync)
    .mockResolvedValue({
      coords: { latitude: -5.38, longitude: -80.73 },
    } as Location.LocationObject);
  await expect(technicalVisitLocation()).resolves.toMatchObject({
    coords: { latitude: -5.38, longitude: -80.73 },
  });
});

test('stops waiting when GPS never responds', async () => {
  jest.useFakeTimers();
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({
      granted: true,
    } as Location.LocationPermissionResponse);
  jest
    .mocked(Location.getCurrentPositionAsync)
    .mockReturnValue(new Promise(() => {}));
  const result = expect(technicalVisitLocation()).rejects.toThrow('GPS');
  await jest.advanceTimersByTimeAsync(20000);
  await result;
  jest.useRealTimers();
});
