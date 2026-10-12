import { formatTransactionTime, localDateKey } from '@/core/i18n/relative-time';
import type { TranslationKey } from '@/core/i18n/translation-key';
import type { Transaction } from '../../domain/entity/home-entity';

export type HistoryItem =
  | {
      kind: 'day';
      key: string;
      dayKey: TranslationKey | undefined;
      day: string;
    }
  | { kind: 'transaction'; transaction: Transaction };

export function toHistoryItems(
  transactions: readonly Transaction[],
  locale: string,
  now = new Date(),
): HistoryItem[] {
  const fullDate = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const items: HistoryItem[] = [];
  let openDate: string | undefined;

  for (const transaction of transactions) {
    const { dayKey, time } = formatTransactionTime(transaction.createdAt, locale, now);

    if (time !== '') {
      const createdAt = new Date(transaction.createdAt);
      const date = localDateKey(createdAt);

      if (date !== openDate) {
        openDate = date;
        items.push({
          kind: 'day',
          key: `day:${transaction.id}`,
          dayKey,
          day: dayKey === undefined ? fullDate.format(createdAt) : '',
        });
      }
    }

    items.push({ kind: 'transaction', transaction });
  }

  return items;
}
