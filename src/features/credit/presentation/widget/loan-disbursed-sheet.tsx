import { useTranslation } from 'react-i18next';
import { BottomSheet, Button, DetailList, Text, VStack } from '@/shared/ui';
import type { LoanQuote } from '../../domain/entity/credit-entity';
import { formatDueDate, formatLoanAmount } from '../../util/format';
import LoanDisbursedArt from '@/assets/illustrations/hand-coins.svg';

type Props = {
  isOpen: boolean;
  quote: LoanQuote;
  feePercent: number;
  locale: string;
  onClose: () => void;
};

export function LoanDisbursedSheet({ isOpen, quote, feePercent, locale, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <BottomSheet isOpen={isOpen} closeLabel={t('common.close')} onClose={onClose} hasCloseButton>
      <VStack align="center" gap="sm" paddingBottom="lg">
        <LoanDisbursedArt width={138} height={115} />
        <Text variant="heading.h3">{t('credit.loanDisbursed')}</Text>
        <Text variant="body.m" color="secondary" align="center">
          {t('credit.loanDisbursedDetail')}
        </Text>
      </VStack>

      <DetailList
        items={[
          {
            label: t('common.amount'),
            value: formatLoanAmount(quote.principalMinor, quote.currency, locale),
          },
          {
            label: t('credit.feeWithPercent', { percent: feePercent }),
            value: formatLoanAmount(quote.feeMinor, quote.currency, locale),
          },
          {
            label: t('credit.youRepay'),
            value: formatLoanAmount(quote.repayableMinor, quote.currency, locale),
            emphasis: true,
          },
          { label: t('credit.dueDate'), value: formatDueDate(quote.dueDate, locale) },
        ]}
      />

      <VStack paddingTop="lg">
        <Button label={t('common.continue')} onPress={onClose} />
      </VStack>
    </BottomSheet>
  );
}
