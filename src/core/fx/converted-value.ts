import { formatMinor } from '@/core/money/money';
import { convertDown } from './convert';
import type { FxQuote } from './fx-rate';

export type ConvertedValue =
  { kind: 'converted'; currency: string; label: string } | { kind: 'pending' };

export type Holding = { valueMinor: number; currency: string };

type Inputs = {
  holding: Holding;
  displayCurrency: string;
  quote: FxQuote | undefined;
  isQuotePending: boolean;
  locale: string;
};

export function convertedValue({
  holding,
  displayCurrency,
  quote,
  isQuotePending,
  locale,
}: Inputs): ConvertedValue | undefined {
  if (displayCurrency === holding.currency) return undefined;

  const isRateForThisPair =
    quote?.baseCurrency === holding.currency && quote.quoteCurrency === displayCurrency;
  const convertedMinor = isRateForThisPair ? convertDown(holding.valueMinor, quote) : undefined;

  if (convertedMinor !== undefined) {
    return {
      kind: 'converted',
      currency: displayCurrency,
      label: formatMinor(convertedMinor, displayCurrency, locale),
    };
  }

  return isQuotePending ? { kind: 'pending' } : undefined;
}
