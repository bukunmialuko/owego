import { ok } from '@/core/result/result';
import { identityQuote } from './convert';
import type { FxRateRepository } from './fx-rate';

const PREVIEW_RATE = 0.74;

const PREVIEW_TTL_MS = 120_000;

export function createPreviewFxRateRepository(): FxRateRepository {
  return {
    getQuote: (baseCurrency, quoteCurrency) => {
      if (baseCurrency === quoteCurrency) {
        return Promise.resolve(ok(identityQuote(baseCurrency)));
      }

      return Promise.resolve(
        ok({
          baseCurrency,
          quoteCurrency,
          rate: PREVIEW_RATE,
          expiresAt: new Date(Date.now() + PREVIEW_TTL_MS).toISOString(),
        }),
      );
    },
  };
}
