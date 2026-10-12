import { ok } from '@/core/result/result';
import type { YieldOverview, YieldOverviewRepository } from './yield-overview';

export const PREVIEW_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const PREVIEW_USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';

const OVERVIEW: YieldOverview = {
  valueMinor: 513_698,
  currency: 'USD',
  change: { percent: 2.2, amountMinor: 33_635 },
  positions: [
    {
      id: 'preview-vault-usdc',
      tokenSymbol: 'USDC',
      tokenMint: PREVIEW_USDC_MINT,
      valueMinor: 350_013,
      currency: 'USD',
      apyPercent: 4.1,
      contributedMinor: 334_940,
      change: { percent: 4.5, amountMinor: 15_073 },
    },
    {
      id: 'preview-vault-usdt',
      tokenSymbol: 'USDT',
      tokenMint: PREVIEW_USDT_MINT,
      valueMinor: 163_685,
      currency: 'USD',
      apyPercent: 3.77,
      contributedMinor: 156_636,
      change: { percent: 4.5, amountMinor: 7_049 },
    },
  ],
};

export function createPreviewYieldOverviewRepository(): YieldOverviewRepository {
  return {
    getOverview: () => Promise.resolve(ok(OVERVIEW)),
  };
}
