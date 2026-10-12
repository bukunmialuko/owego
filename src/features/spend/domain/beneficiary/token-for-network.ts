import { CHAIN_METADATA } from '@/core/reference-data/chain-metadata';

export function tokenForNetwork(current: string, networkCode: string): string {
  const supported = CHAIN_METADATA[networkCode]?.supportedTokens;
  if (supported === undefined || supported.includes(current)) return current;

  return supported[0] ?? current;
}
