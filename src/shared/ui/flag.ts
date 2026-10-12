import * as FLAG_SVG from 'country-flag-icons/string/1x1';

const REGIONAL_INDICATOR_OFFSET = 0x1f1e6;
const LETTER_A = 'A'.charCodeAt(0);

export function flagFor(countryCode: string): string {
  const code = countryCode.trim();
  if (!/^[A-Za-z]{2}$/.test(code)) return '';

  return [...code.toUpperCase()]
    .map((letter) =>
      String.fromCodePoint(letter.charCodeAt(0) - LETTER_A + REGIONAL_INDICATOR_OFFSET),
    )
    .join('');
}

export function flagSvgFor(countryCode: string): string | undefined {
  const code = countryCode.trim();
  if (!/^[A-Za-z]{2}$/.test(code)) return undefined;

  return (FLAG_SVG as Record<string, string | undefined>)[code.toUpperCase()];
}

const CURRENCY_COUNTRY: Record<string, string> = {
  XOF: 'CI',
  EUR: 'EU',
};

export function flagForCurrency(currencyCode: string): string {
  const code = currencyCode.trim().toUpperCase();

  return flagFor(CURRENCY_COUNTRY[code] ?? code.slice(0, 2));
}
