import { formatTransactionTime, localDateKey } from '@/core/i18n/relative-time';
import type { TranslationKey } from '@/core/i18n/translation-key';

export type DayGroup<T> = {
  key: string;
  dayKey: TranslationKey | undefined;
  day: string;
  items: T[];
};

export function groupByDay<T>(
  items: readonly T[],
  timestampOf: (item: T) => string,
  locale: string,
  now = new Date(),
): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];

  for (const item of items) {
    const iso = timestampOf(item);
    const { dayKey, day, time } = formatTransactionTime(iso, locale, now);
    if (time === '') continue;

    const key = localDateKey(new Date(iso));
    const open = groups.at(-1);

    if (open?.key === key) {
      open.items.push(item);
      continue;
    }

    groups.push({ key, dayKey, day, items: [item] });
  }

  return groups;
}
