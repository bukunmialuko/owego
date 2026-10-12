import { useTranslation } from 'react-i18next';
import { formatMinorTrimmed } from '@/core/money/money';
import { DetailList } from '@/shared/ui';
import type { YieldQuote } from '../../domain/entity/yield-quote';

export function MoveSummary({ quote }: { quote: YieldQuote }) {
  const { t, i18n } = useTranslation();
  const money = (minor: number) => formatMinorTrimmed(minor, quote.currency, i18n.language);
  const isDeposit = quote.kind === 'deposit';

  return (
    <DetailList
      size="m"
      items={[
        {
          label: t('yield.transaction'),
          value: t(isDeposit ? 'yield.transactionDeposit' : 'yield.transactionWithdrawal'),
          emphasis: true,
        },
        {
          label: t(isDeposit ? 'yield.investment' : 'common.amount'),
          value: money(quote.amountMinor),
          emphasis: true,
        },
        { label: t('common.fee'), value: money(quote.feeMinor), emphasis: true },
        { label: t('yield.totalPayment'), value: money(quote.totalMinor), emphasis: true },
      ]}
    />
  );
}
