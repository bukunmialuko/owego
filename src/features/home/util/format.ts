import {
  formatMinor,
  formatMinorTrimmed,
  isCurrencyCode,
  type CurrencyCode,
} from '@/core/money/money';

const TOKEN_CURRENCY: CurrencyCode = 'USD';

export function formatAmountMinor(amountMinor: number, currency: string, locale: string): string {
  return formatMinor(amountMinor, currency, locale, TOKEN_CURRENCY);
}

export function splitAmount(formatted: string): { major: string; minor: string } {
  const separator = /[.,](?=\d{1,2}\D*$)/.exec(formatted);

  if (separator?.index === undefined) return { major: formatted, minor: '' };

  return {
    major: formatted.slice(0, separator.index),
    minor: formatted.slice(separator.index),
  };
}

function asCurrency(code: string): CurrencyCode {
  return isCurrencyCode(code) ? code : TOKEN_CURRENCY;
}

export function formatRateFigure(value: number, currency: string, locale: string): string {
  return formatMinorTrimmed(Math.round(value * 100), asCurrency(currency), locale);
}
