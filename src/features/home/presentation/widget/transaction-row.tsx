import { useTranslation } from 'react-i18next';
import { ThemeScope } from '@/core/design-system/theme-provider';
import { Avatar, TransactionRow, type TransactionRowDensity } from '@/shared/ui';
import type { Transaction } from '../../domain/entity/home-entity';
import { formatAmountMinor } from '../../util/format';
import { formatTimestamp } from '@/core/i18n/relative-time';

type Props = {
  transaction: Transaction;
  locale: string;
  onPress: (id: string) => void;
  density?: TransactionRowDensity;
};

export function HomeTransactionRow({ transaction, locale, onPress, density = 'regular' }: Props) {
  const { t } = useTranslation();
  const hasFailed = transaction.status === 'failed';
  const tone = hasFailed ? 'failed' : transaction.direction;

  const amount = formatAmountMinor(transaction.amountMinor, transaction.currency, locale);
  const signed = `${transaction.direction === 'incoming' ? '+' : '-'}${amount}`;
  const timestamp = formatTimestamp(transaction.createdAt, locale, t);

  return (
    <TransactionRow
      title={transaction.title}
      subtitle={hasFailed ? `${t('home.transactionFailed')} · ${timestamp}` : timestamp}
      amount={signed}
      isMuted={hasFailed}
      amountTone={tone}
      density={density}
      leading={
        <ThemeScope mode="light">
          <Avatar name={transaction.title} size="row" tint="neutralSubtle" badge={tone} />
        </ThemeScope>
      }
      onPress={() => {
        onPress(transaction.id);
      }}
    />
  );
}
