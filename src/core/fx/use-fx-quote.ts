import { useQuery } from '@tanstack/react-query';
import { useResolve } from '@/core/di/container-provider';
import { AppErrorException } from '@/core/errors/app-error-exception';
import { devLog } from '@/core/log/dev-log';
import { millisecondsUntilExpiry } from './expiry';
import type { FxQuote } from './fx-rate';

const fxQueryKey = {
  quote: (baseCurrency: string, quoteCurrency: string) =>
    ['fx', 'quote', baseCurrency, quoteCurrency] as const,
};

type Options = {
  refreshIntervalMs: number;
};

export function useFxQuote(
  baseCurrency: string,
  quoteCurrency: string,
  { refreshIntervalMs }: Options,
) {
  const fxRateRepository = useResolve('fxRateRepository');

  return useQuery<FxQuote | null>({
    queryKey: fxQueryKey.quote(baseCurrency, quoteCurrency),
    queryFn: async () => {
      const result = await fxRateRepository.getQuote(baseCurrency, quoteCurrency);
      if (!result.ok) {
        devLog('fx', 'quote failed', {
          base: baseCurrency,
          quote: quoteCurrency,
          code: result.error.code,
        });
        throw new AppErrorException(result.error);
      }

      return result.value ?? null;
    },
    enabled: baseCurrency !== '' && quoteCurrency !== '',
    refetchInterval: (query) =>
      millisecondsUntilExpiry(query.state.data, Date.now()) ?? refreshIntervalMs,
  });
}
