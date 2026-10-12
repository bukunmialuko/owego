import { useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '@/core/i18n/relative-time';
import { formatMinorExact } from '@/core/money/money';
import { DetailList, type DetailItem } from '@/shared/ui';
import type {
  Figure,
  TransactionDetail,
  TransactionKind,
} from '../../domain/entity/transaction-detail';

type Props = {
  detail: TransactionDetail;
  locale: string;
};

const ONE_DOLLAR_MINOR = 100;
const MINOR_PER_UNIT = 100;

export function TransactionDetailList({ detail, locale }: Props) {
  const { t } = useTranslation();
  const [hasCopied, setHasCopied] = useState(false);
  const money = (figure: Figure) => formatMinorExact(figure.minor, figure.currency, locale);
  const date = formatDateTime(detail.createdAt, locale, t);

  const items: DetailItem[] = [
    ...(date === '' ? [] : [{ label: t('common.dateAndTime'), value: date, emphasis: true }]),
    {
      label: t(detail.direction === 'outgoing' ? 'home.totalAmountPaid' : 'common.amount'),
      value: money(detail.amount),
      emphasis: true,
      ...(detail.localAmount === undefined ? {} : { secondaryValue: money(detail.localAmount) }),
    },
    ...(detail.fee === undefined
      ? []
      : [{ label: t('common.fee'), value: money(detail.fee), emphasis: true }]),
    ...(detail.rate === undefined || detail.localAmount === undefined
      ? []
      : [
          {
            label: t('common.rate'),
            value: t('home.fxRateLine', {
              base: formatMinorExact(ONE_DOLLAR_MINOR, 'USD', locale, { trim: true }),
              quote: money({
                minor: Math.round(detail.rate * MINOR_PER_UNIT),
                currency: detail.localAmount.currency,
              }),
            }),
            emphasis: true,
          },
        ]),
    ...(detail.narration === undefined
      ? []
      : [{ label: t('common.narration'), value: detail.narration, emphasis: true }]),
    closingRow(detail.kind, t),
    {
      label: t('common.transactionId'),
      value: detail.id,
      emphasis: true,
      truncate: true,
      action: {
        icon: hasCopied ? 'checkmark' : 'copy',
        label: t(hasCopied ? 'home.transactionIdCopied' : 'home.copyTransactionId'),
        onPress: () => {
          Clipboard.setString(detail.id);
          setHasCopied(true);
          AccessibilityInfo.announceForAccessibility(t('home.transactionIdCopied'));
        },
      },
    },
  ];

  return <DetailList items={items} size="m" />;
}

function closingRow(kind: TransactionKind, t: TFunction): DetailItem {
  switch (kind) {
    case 'payout':
      return {
        label: t('home.transactionType'),
        value: t('home.transactionDebit'),
        emphasis: true,
      };
    case 'send':
      return { label: t('common.from'), value: t('home.wallet'), emphasis: true };
    case 'receive':
      return { label: t('common.to'), value: t('home.wallet'), emphasis: true };
  }
}
