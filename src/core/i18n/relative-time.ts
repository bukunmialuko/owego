import type { TFunction } from 'i18next';
import type { TranslationKey } from './translation-key';

type Formatted = { dayKey: TranslationKey | undefined; day: string; time: string };

export function formatTransactionTime(iso: string, locale: string, now = new Date()): Formatted {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return { dayKey: undefined, day: '', time: '' };

  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
  const days = daysBetween(date, now);

  if (days === 0) return { dayKey: 'common.today', day: '', time };
  if (days === 1) return { dayKey: 'common.yesterday', day: '', time };

  return {
    dayKey: undefined,
    day: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date),
    time,
  };
}

function daysBetween(date: Date, now: Date): number {
  const startOf = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();

  return Math.round((startOf(now) - startOf(date)) / 86_400_000);
}

export function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(date.getDate()).padStart(2, '0');

  return `${String(date.getFullYear())}-${month}-${dayOfMonth}`;
}

export function formatTimestamp(
  iso: string,
  locale: string,
  t: TFunction,
  now = new Date(),
): string {
  const { dayKey, day, time } = formatTransactionTime(iso, locale, now);
  if (time === '') return '';

  return `${dayKey === undefined ? day : t(dayKey)}, ${time}`;
}

export function formatDateTime(iso: string, locale: string, t: TFunction): string {
  const date = new Date(iso);

  if (iso === '' || Number.isNaN(date.getTime())) return '';

  const day = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);

  return t('common.dateAtTime', { date: day, time });
}
