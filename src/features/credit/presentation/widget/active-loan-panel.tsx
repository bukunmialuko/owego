import { useTranslation } from 'react-i18next';
import { Button, Card, EmptyState, HStack, ProgressBar, Text, VStack } from '@/shared/ui';
import type { Loan } from '../../domain/entity/credit-entity';
import { outstandingMinor, repaymentProgress } from '../../domain/entity/credit-entity';
import { formatDueDate, formatLoanAmount } from '../../util/format';
import NoLoanArt from '@/assets/illustrations/no-loan.svg';
import OutstandingMark from '@/assets/icons/outstanding-balance.svg';

type Props = {
  loan: Loan | undefined;
  locale: string;
  onPressRepay: () => void;
  onPressNewLoan: () => void;
};

export function ActiveLoanPanel({ loan, locale, onPressRepay, onPressNewLoan }: Props) {
  const { t } = useTranslation();

  if (loan === undefined) {
    return (
      <EmptyState
        title={t('credit.noLoanTitle')}
        description={t('credit.noLoanDescription')}
        illustration={<NoLoanArt width={166} height={163} />}
        action={
          <Button
            variant="primary"
            icon="add"
            label={t('credit.getNewLoan')}
            onPress={onPressNewLoan}
          />
        }
      />
    );
  }

  const outstanding = formatLoanAmount(outstandingMinor(loan), loan.currency, locale);
  const repaid = formatLoanAmount(loan.repaidMinor, loan.currency, locale);

  return (
    <VStack gap="lg">
      <HStack justify="space-between" align="flex-start" gap="md">
        <VStack gap="xxs">
          <Text variant="body.mMedium" color="secondary">
            {t('credit.outstandingBalance')}
          </Text>
          <Text variant="numeric.lLoose">{outstanding}</Text>
        </VStack>
        <OutstandingMark width={60} height={60} />
      </HStack>

      <Card variant="sunken" radius="md" padding="md" gap="md">
        <HStack justify="space-between" gap="lg">
          <Text variant="body.s" color="secondary">
            {t('credit.amountRepaid')}
          </Text>
          <Text variant="body.sMedium">{repaid}</Text>
        </HStack>

        <ProgressBar
          value={repaymentProgress(loan)}
          tone="error"
          accessibilityLabel={t('credit.amountRepaid')}
        />

        <HStack justify="space-between" gap="lg">
          <Text variant="body.s" color="secondary">
            {t('credit.dueDate')}
          </Text>
          <Text variant="body.sMedium">{formatDueDate(loan.dueDate, locale)}</Text>
        </HStack>
      </Card>

      <VStack gap="sm">
        <Button label={t('credit.repay')} onPress={onPressRepay} />
        <Text variant="body.m" color="secondary" align="center">
          {t('credit.earlyRepaymentHint')}
        </Text>
      </VStack>
    </VStack>
  );
}
