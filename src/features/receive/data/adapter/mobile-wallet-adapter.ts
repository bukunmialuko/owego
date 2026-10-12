import type { SolanaCluster } from '@/core/config/app-config';
import { ok } from '@/core/result/result';
import type { ExternalWalletPort } from '../../domain/port/external-wallet-port';

export function createMobileWalletAdapter(_: { cluster: SolanaCluster }): ExternalWalletPort {
  return {
    connect: () => Promise.resolve(ok({ type: 'failed', reason: 'unsupported' })),
    signAndSend: () => Promise.resolve(ok({ type: 'notSent', reason: 'unsupported' })),
  };
}
