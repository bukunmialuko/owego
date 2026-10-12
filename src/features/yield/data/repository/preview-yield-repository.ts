import { ok } from '@/core/result/result';
import {
  PREVIEW_USDC_MINT,
  PREVIEW_USDT_MINT,
} from '@/core/yield/preview-yield-overview-repository';
import type { YieldProduct } from '../../domain/entity/yield-entity';
import type { YieldRepository } from '../../domain/repository/yield-repository';

const FEE_MINOR = 25;

const PRODUCTS: YieldProduct[] = [
  {
    id: 'preview-vault-usdc',
    tokenSymbol: 'USDC',
    tokenMint: PREVIEW_USDC_MINT,
    apyPercent: 4.1,
    provider: 'jupiter',
    isStakeable: true,
  },
  {
    id: 'preview-vault-usdt',
    tokenSymbol: 'USDT',
    tokenMint: PREVIEW_USDT_MINT,
    apyPercent: 3.77,
    provider: 'jupiter',
    isStakeable: false,
  },
];

export function createPreviewYieldRepository(): YieldRepository {
  return {
    getProducts: () => Promise.resolve(ok(PRODUCTS)),

    quote: ({ kind, amountMinor }) =>
      Promise.resolve(
        ok({
          kind,
          amountMinor,
          feeMinor: FEE_MINOR,
          totalMinor: kind === 'deposit' ? amountMinor + FEE_MINOR : amountMinor - FEE_MINOR,
          currency: 'USD' as const,
        }),
      ),

    initiate: () =>
      Promise.resolve(
        ok({
          challenge: {
            challengeId: 'preview-challenge',
            userToken: 'preview-user-token',
            encryptionKey: 'preview-encryption-key',
          },
          transactionId: 'preview-transaction',
        }),
      ),

    broadcast: () => Promise.resolve(ok('succeeded' as const)),
  };
}
