import { getRandomValues } from 'expo-crypto';

export type SecureRandom = (length: number) => Uint8Array;

export const secureRandom: SecureRandom = (length) => getRandomValues(new Uint8Array(length));
