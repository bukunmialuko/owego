import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { formatMinor, isCurrencyCode } from '@/core/money/money';
import { useAmountDraft } from '@/core/money/use-amount-draft';
import {
  AmountKeypad,
  Button,
  Chip,
  DetailList,
  Icon,
  Screen,
  ScreenHeader,
  Skeleton,
  Text,
  VStack,
} from '@/shared/ui';
import { outstandingMinor } from '../domain/entity/credit-entity';
import type { LoanRepayment } from '../domain/entity/credit-entity';
import { useActiveLoan, useRepayLoan, useRepaymentBalance } from './hook/use-credit';
import { formatDueDate, formatLoanAmount } from '../util/format';
import { LoanRepaidSheet } from './widget/loan-repaid-sheet';

const MINOR_SCALE = 100;

const FUNDING_TOKEN = 'USDC';

export function RepayLoanScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();

  const [repayment, setRepayment] = useState<LoanRepayment | undefined>(undefined);

  const activeLoan = useActiveLoan();
  const balance = useRepaymentBalance(FUNDING_TOKEN);
  const repay = useRepayLoan();

  const loan = activeLoan.data ?? undefined;
  const currency = loan?.currency ?? '';
  const amount = useAmountDraft(isCurrencyCode(currency) ? currency : 'USD', i18n.language);

  const enteredMinor = Math.round(amount.value * MINOR_SCALE);
  const outstanding = loan === undefined ? 0 : outstandingMinor(loan);
  const isValid = loan !== undefined && enteredMinor > 0 && enteredMinor <= outstanding;

  const balanceMinor = balance.data?.amountMinor;

  return (
    <Screen
      scroll
      contentStyle={styles.content}
      footer={
        <AmountKeypad
          onKey={amount.press}
          allowDecimal={amount.allowDecimal}
          decimalLabel={t('common.decimalPoint')}
          deleteLabel={t('common.clear')}
        />
      }
    >
      <VStack paddingX="lg" gap="xl">
        <ScreenHeader
          title={t('credit.repayLoan')}
          align="leading"
          onBack={() => {
            navigation.goBack();
          }}
          trailing={
            balanceMinor === undefined ? undefined : (
              <Chip
                label={formatMinor(balanceMinor, FUNDING_TOKEN, i18n.language)}
                accessibilityLabel={`${t('spend.balanceLabel')}, ${formatMinor(
                  balanceMinor,
                  FUNDING_TOKEN,
                  i18n.language,
                )}`}
                leading={<Icon name="wallet-outline" size="sm" color="secondary" />}
              />
            )
          }
        />

        <VStack align="center" gap="xxs" paddingY="xl">
          <Text variant="body.m" color="secondary">
            {t('common.amount')}
          </Text>
          <Text variant="numeric.xl" numberOfLines={1}>
            {formatLoanAmount(enteredMinor, currency, i18n.language)}
          </Text>
        </VStack>

        {activeLoan.isPending ? (
          <Skeleton height={106} />
        ) : (
          loan !== undefined && (
            <DetailList
              items={[
                {
                  label: t('credit.loanAmount'),
                  value: formatLoanAmount(loan.repayableMinor, loan.currency, i18n.language),
                },
                {
                  label: t('credit.dueNow'),
                  value: formatLoanAmount(outstanding, loan.currency, i18n.language),
                },
                {
                  label: t('credit.dueDate'),
                  value: formatDueDate(loan.dueDate, i18n.language),
                },
              ]}
            />
          )
        )}

        <Button
          label={t('common.continue')}
          disabled={!isValid}
          isLoading={repay.isPending}
          onPress={() => {
            repay.mutate(enteredMinor, {
              onSuccess: setRepayment,
            });
          }}
        />
      </VStack>

      {repayment !== undefined && (
        <LoanRepaidSheet
          isOpen
          repayment={repayment}
          amountMinor={enteredMinor}
          feePercent={loan?.feePercent ?? 0}
          locale={i18n.language}
          onClose={() => {
            setRepayment(undefined);
            navigation.goBack();
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
});
