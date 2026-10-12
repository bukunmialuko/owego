import { formatMinorTrimmed } from '@/core/money/money';

const TRAVEL_CURRENCY = 'USD';

export function formatTravelPrice(amountMinor: number, currency: string, locale: string): string {
  return formatMinorTrimmed(amountMinor, currency, locale, TRAVEL_CURRENCY);
}

export function formatDateRange(from: string, to: string, locale: string): string {
  const format = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

  return `${format.format(new Date(`${from}T00:00:00Z`))} - ${format.format(new Date(`${to}T00:00:00Z`))}`;
}
