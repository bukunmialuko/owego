import { useTranslation } from 'react-i18next';
import { Card, DetailList, HStack, IconCircle, Text, TransactionRow, VStack } from '@/shared/ui';
import Clock from '@/assets/icons/clock.svg';
import { useTheme } from '@/core/design-system/theme-provider';
import type { LoanHistory, LoanMovement } from '../../domain/entity/credit-entity';
import { formatTimestamp } from '@/core/i18n/relative-time';
import { formatLedgerAmount, formatLoanAmount } from '../../util/format';

type Props = {
  history: LoanHistory | undefined;
  movements: LoanMovement[];
  locale: string;
};

export function LoanHistoryPanel({ history, movements, locale }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <VStack gap="xl">
      {history !== undefined && (
        <DetailList
          items={[
            {
              label: t('credit.totalBorrowed'),
              value: formatLoanAmount(history.totalBorrowedMinor, history.currency, locale),
            },
            { label: t('credit.loansCompleted'), value: String(history.loansCompleted) },
            { label: t('credit.onTimeRate'), value: `${String(history.onTimeRatePercent)}%` },
          ]}
        />
      )}

      <VStack gap="sm">
        <HStack gap="xs">
          <Clock
            width={theme.size.icon.xs}
            height={theme.size.icon.xs}
            color={theme.color.iconSecondary}
          />
          <Text variant="body.mMedium" color="secondary">
            {t('credit.transactions')}
          </Text>
        </HStack>

        <Card variant="sunken" padding="md">
          {movements.map((movement) => {
            const isRepayment = movement.kind === 'repayment';

            return (
              <TransactionRow
                key={movement.id}
                title={t(isRepayment ? 'credit.loanRepayment' : 'credit.loanCollected')}
                subtitle={formatTimestamp(movement.createdAt, locale, t)}
                amount={`${isRepayment ? '+' : '-'}${formatLedgerAmount(
                  movement.amountMinor,
                  movement.currency,
                  locale,
                )}`}
                leading={
                  <IconCircle
                    tone="neutral"
                    icon={isRepayment ? 'arrow-down-outline' : 'arrow-up-outline'}
                    size="md"
                  />
                }
              />
            );
          })}
        </Card>
      </VStack>
    </VStack>
  );
}
