import { useTranslation } from 'react-i18next';
import { formatMinor } from '@/core/money/money';
import { DetailList, type DetailItem } from '@/shared/ui';
import type { TransferQuote } from '../../domain/entity/asset-transfer';

type Props = {
  quote: TransferQuote;
  locale: string;
  inWallet?: TransferQuote;
  rateLine?: string;
  narration?: string;
};

export function TransferSummary({ quote, locale, inWallet, rateLine, narration }: Props) {
  const { t } = useTranslation();

  const row = (label: string, minor: number, walletMinor: number | undefined): DetailItem => ({
    label,
    value: formatMinor(minor, quote.currency, locale),
    emphasis: true,
    ...(inWallet === undefined || walletMinor === undefined
      ? {}
      : { secondaryValue: formatMinor(walletMinor, inWallet.currency, locale) }),
  });

  return (
    <DetailList
      size="m"
      items={[
        row(t('spend.totalAmountPaid'), quote.totalMinor, inWallet?.totalMinor),
        row(t('common.fee'), quote.feeMinor, inWallet?.feeMinor),
        row(t('spend.recipientGets'), quote.recipientGetsMinor, inWallet?.recipientGetsMinor),
        ...(rateLine === undefined
          ? []
          : [{ label: t('spend.rate'), value: rateLine, emphasis: true }]),
        ...(narration === undefined
          ? []
          : [{ label: t('spend.narration'), value: narration, emphasis: true }]),
        { label: t('common.from'), value: t('spend.sourceWallet'), emphasis: true },
      ]}
    />
  );
}
