import { displayCurrencyCountry } from '@/core/display-currency/use-display-currency';
import type { FxQuote } from '@/core/fx/fx-rate';
import { formatMinor } from '@/core/money/money';
import type { AvailableBalance } from '@/core/wallet/available-balance';
import { formatRateFigure } from './format';

export type BalanceChip =
  | { kind: 'converted'; countryCode: string; amount: string }
  | { kind: 'rate'; countryCode: string; base: string; quote: string }
  | { kind: 'pending' };

export function balanceChip({
  isHidden,
  converted,
  quote,
  isPending,
  locale,
}: {
  isHidden: boolean;
  converted: AvailableBalance | undefined;
  quote: FxQuote | undefined;
  isPending: boolean;
  locale: string;
}): BalanceChip | undefined {
  if (isHidden && quote !== undefined) {
    return {
      kind: 'rate',
      countryCode: displayCurrencyCountry(quote.quoteCurrency) ?? '',
      base: formatRateFigure(1, quote.baseCurrency, locale),
      quote: formatRateFigure(quote.rate, quote.quoteCurrency, locale),
    };
  }

  if (!isHidden && converted !== undefined) {
    return {
      kind: 'converted',
      countryCode: displayCurrencyCountry(converted.currency) ?? '',
      amount: formatMinor(converted.amountMinor, converted.currency, locale),
    };
  }

  return isPending ? { kind: 'pending' } : undefined;
}
