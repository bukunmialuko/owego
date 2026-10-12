import { useTranslation } from 'react-i18next';
import { BottomSheet, Button, DetailList, Text, VStack } from '@/shared/ui';
import type { LoanRepayment } from '../../domain/entity/credit-entity';
import { formatLoanAmount } from '../../util/format';
import LoanRepaidArt from '@/assets/illustrations/hand-coins.svg';

type Props = {
  isOpen: boolean;
  repayment: LoanRepayment;
  amountMinor: number;
  feePercent: number;
  locale: string;
  onClose: () => void;
};

export function LoanRepaidSheet({
  isOpen,
  repayment,
  amountMinor,
  feePercent,
  locale,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const { currency } = repayment.loan;
  const feeMinor = Math.round((amountMinor * feePercent) / 100);

  return (
    <BottomSheet isOpen={isOpen} closeLabel={t('common.close')} onClose={onClose} hasCloseButton>
      <VStack align="center" gap="sm" paddingBottom="lg">
        <LoanRepaidArt width={138} height={115} />
        <Text variant="heading.h3">{t('credit.loanRepaid')}</Text>
        <Text variant="body.m" color="secondary" align="center">
          {t('credit.loanDisbursedDetail')}
        </Text>
      </VStack>

      <DetailList
        items={[
          {
            label: t('common.amount'),
            value: formatLoanAmount(amountMinor, currency, locale),
          },
          {
            label: t('credit.feeWithPercent', { percent: feePercent }),
            value: formatLoanAmount(feeMinor, currency, locale),
          },
          {
            label: t('credit.creditScore'),
            value: t('credit.scoreGain', { points: repayment.scoreDeltaPoints }),
            isGain: true,
          },
        ]}
      />

      <VStack paddingTop="lg">
        <Button label={t('common.continue')} onPress={onClose} />
      </VStack>
    </BottomSheet>
  );
}
