import { formatMinor } from '@/core/money/money';

const WEALTH_CURRENCY = 'USD';

export function formatLedgerAmount(amountMinor: number, currency: string, locale: string): string {
  return formatMinor(amountMinor, currency, locale, WEALTH_CURRENCY);
}
