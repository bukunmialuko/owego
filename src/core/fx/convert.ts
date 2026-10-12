import { fractionDigitsFor, isCurrencyCode } from '@/core/money/money';
import type { FxQuote } from './fx-rate';

const API_MINOR_PLACES = 2;
const MICRO_PLACES = 6;

export function convert(amountMinor: number, quote: FxQuote): number {
  if (!Number.isFinite(amountMinor)) return 0;

  return Math.round(amountMinor * quote.rate);
}

export function convertDown(amountMinor: number, quote: FxQuote): number | undefined {
  const currency = quote.quoteCurrency;
  if (!isCurrencyCode(currency)) return undefined;

  const convertedMicro = Math.round(
    amountMinor * 10 ** (MICRO_PLACES - API_MINOR_PLACES) * quote.rate,
  );
  const places = fractionDigitsFor(currency);
  const smallestUnits = Math.floor(convertedMicro / 10 ** (MICRO_PLACES - places));

  return smallestUnits * 10 ** (API_MINOR_PLACES - places);
}

export function invert(quote: FxQuote): FxQuote {
  return {
    baseCurrency: quote.quoteCurrency,
    quoteCurrency: quote.baseCurrency,
    rate: 1 / quote.rate,
    ...(quote.expiresAt === undefined ? {} : { expiresAt: quote.expiresAt }),
  };
}

export function identityQuote(currency: string): FxQuote {
  return { baseCurrency: currency, quoteCurrency: currency, rate: 1 };
}
