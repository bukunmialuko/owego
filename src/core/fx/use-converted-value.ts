import { useTranslation } from 'react-i18next';
import { useDisplayCurrency } from '@/core/display-currency/use-display-currency';
import { convertedValue, type ConvertedValue, type Holding } from './converted-value';
import { useFxQuote } from './use-fx-quote';

const RATE_REFRESH_MS = 2 * 60_000;

export function useConvertedValue(holding: Holding | undefined): ConvertedValue | undefined {
  const { i18n } = useTranslation();
  const { code } = useDisplayCurrency();
  const base = holding?.currency ?? '';
  const needsRate = base !== '' && code !== base;
  const fxQuote = useFxQuote(base, needsRate ? code : '', { refreshIntervalMs: RATE_REFRESH_MS });

  if (holding === undefined) return undefined;

  return convertedValue({
    holding,
    displayCurrency: code,
    quote: fxQuote.data ?? undefined,
    isQuotePending: needsRate && fxQuote.isPending,
    locale: i18n.language,
  });
}
