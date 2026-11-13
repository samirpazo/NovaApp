import * as Location from 'expo-location';

export async function technicalVisitLocation() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      'Permite el acceso a la ubicación para registrar la visita.',
    );
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () =>
            reject(
              new Error(
                'No se pudo obtener la ubicación. Comprueba que el GPS esté activo y vuelve a intentar.',
              ),
            ),
          20000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}
