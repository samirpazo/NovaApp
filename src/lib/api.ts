import { AxiosError, create } from 'axios';
import { Platform } from 'react-native';

export interface ApiClientOptions {
  baseUrl: string;
  accessToken?: string | null;
}

export function createApiClient({ baseUrl, accessToken }: ApiClientOptions) {
  return create({
    baseURL: baseUrl.replace(/\/+$/, ''),
    timeout: 30_000,
    withCredentials: Platform.OS === 'web',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(Platform.OS === 'web' ? {} : { 'X-Client-Platform': 'native' }),
    },
  });
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data;
    if (data && typeof data === 'object' && 'Message' in data && typeof data.Message === 'string') {
      return data.Message;
    }
    if (error.code === 'ECONNABORTED') return 'La conexión con Nova agotó el tiempo de espera.';
    if (!error.response) return 'No se pudo conectar con el servidor de Nova.';
  }
  return error instanceof Error ? error.message : 'No se pudo completar la sincronización.';
}
