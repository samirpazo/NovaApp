import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';

export async function hashPassword(password: string): Promise<string> {
  if (!password) return '';
  const pepper = process.env.EXPO_PUBLIC_PASSWORD_PEPPER;
  if (!pepper)
    throw new Error('EXPO_PUBLIC_PASSWORD_PEPPER no está configurado.');
  return digestStringAsync(CryptoDigestAlgorithm.SHA512, password + pepper);
}
