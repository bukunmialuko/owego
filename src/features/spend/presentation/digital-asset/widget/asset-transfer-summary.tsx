import { useTranslation } from 'react-i18next';
import { formatMinor, formatMinorExact } from '@/core/money/money';
import { DetailList, type DetailItem } from '@/shared/ui';

type Props = {
  amountMinor: number;
  tokenSymbol: string;
  balanceMinor?: number | undefined;
  locale: string;
};

const CURRENCY = 'USD';

export function AssetTransferSummary({ amountMinor, tokenSymbol, balanceMinor, locale }: Props) {
  const { t } = useTranslation();

  const items: DetailItem[] = [
    {
      label: t('spend.totalAmountPaid'),
      value: formatMinor(amountMinor, CURRENCY, locale),
      emphasis: true,
    },
    {
      label: t('spend.recipientGets'),
      value: formatMinorExact(amountMinor, tokenSymbol, locale),
      emphasis: true,
    },
    { label: t('common.from'), value: t('spend.sourceWallet'), emphasis: true },
    ...(balanceMinor === undefined
      ? []
      : [
          {
            label: t('spend.balance'),
            value: formatMinor(balanceMinor, CURRENCY, locale),
            emphasis: true,
          },
        ]),
  ];

  return <DetailList size="m" items={items} />;
}
