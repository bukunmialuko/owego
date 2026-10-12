import type { SolanaCluster } from '@/core/config/app-config';

const SIGNATURE = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;

export function isSolanaSignature(value: string): boolean {
  return SIGNATURE.test(value);
}

export function solscanTransactionUrl(
  signature: string,
  cluster: SolanaCluster,
): string | undefined {
  if (!isSolanaSignature(signature)) return undefined;

  const url = `https://solscan.io/tx/${signature}`;
  return cluster === 'mainnet-beta' ? url : `${url}?cluster=${cluster}`;
}
