import { formatMinor, formatMinorTrimmed } from '@/core/money/money';

const LOAN_CURRENCY = 'USD';

export function formatLoanAmount(amountMinor: number, currency: string, locale: string): string {
  return formatMinorTrimmed(amountMinor, currency, locale, LOAN_CURRENCY);
}

export function formatLedgerAmount(amountMinor: number, currency: string, locale: string): string {
  return formatMinor(amountMinor, currency, locale, LOAN_CURRENCY);
}

export function formatDueDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
