import { fromZodError } from '@/core/errors/app-error';
import type { HttpClient } from '@/core/network/http-client';
import { andThen, err, ok } from '@/core/result/result';
import { identityQuote } from './convert';
import { fxRateResponseSchema } from './fx-rate-model';
import type { FxQuote, FxRateRepository } from './fx-rate';

export function createFxRateRepositoryImpl({ post }: Pick<HttpClient, 'post'>): FxRateRepository {
  return {
    async getQuote(baseCurrency, quoteCurrency) {
      if (baseCurrency === quoteCurrency) return ok(identityQuote(baseCurrency));

      const response = await post<unknown>('/transaction/rate', {
        source_currency: baseCurrency,
        destination_currency: quoteCurrency,
      });

      return andThen(response, (payload) => {
        const parsed = fxRateResponseSchema.safeParse(payload);
        if (!parsed.success) return err(fromZodError(parsed.error));

        const { rate, expire_at: expiresAt } = parsed.data.data;
        if (rate <= 0) return ok(undefined);

        const quote: FxQuote = { baseCurrency, quoteCurrency, rate };

        return ok(expiresAt === '' ? quote : { ...quote, expiresAt });
      });
    },
  };
}
