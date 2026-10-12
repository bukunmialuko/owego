import { decimalToMinorFloor } from '@/core/money/money';

export function formatTokenAmount(amount: string, symbol: string, locale: string): string {
  const cents = decimalToMinorFloor(amount) ?? 0;
  const figure = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);

  return `${figure} ${symbol}`;
}
