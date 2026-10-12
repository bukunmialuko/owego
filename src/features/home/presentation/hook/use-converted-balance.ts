import { useDisplayCurrency } from '@/core/display-currency/use-display-currency';
import type { FxQuote } from '@/core/fx/fx-rate';
import { useFxQuote } from '@/core/fx/use-fx-quote';
import { availableBalance, type AvailableBalance } from '@/core/wallet/available-balance';
import { useWalletsQuery } from '@/core/wallet/use-wallets-query';

const BASE_CURRENCY = 'USD';
const RATE_REFRESH_MS = 2 * 60_000;

type ConvertedBalanceState = {
  converted: AvailableBalance | undefined;
  quote: FxQuote | undefined;
  isPending: boolean;
  refetch: () => Promise<unknown>;
};

export function useConvertedBalance(): ConvertedBalanceState {
  const { code } = useDisplayCurrency();
  const isDollars = code === BASE_CURRENCY;
  const wallets = useWalletsQuery();
  const fxQuote = useFxQuote(BASE_CURRENCY, isDollars ? '' : code, {
    refreshIntervalMs: RATE_REFRESH_MS,
  });

  const quote = isDollars ? undefined : (fxQuote.data ?? undefined);

  return {
    converted:
      wallets.data === undefined || quote === undefined
        ? undefined
        : availableBalance(wallets.data, quote),
    quote,
    isPending: !isDollars && (wallets.isPending || fxQuote.isPending),
    refetch: () => fxQuote.refetch(),
  };
}
