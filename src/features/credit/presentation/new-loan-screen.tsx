import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { isCurrencyCode } from '@/core/money/money';
import { useAmountDraft } from '@/core/money/use-amount-draft';
import { AmountKeypad, Button, DetailList, Screen, ScreenHeader, Text, VStack } from '@/shared/ui';
import { isWithinOffer } from '../domain/entity/credit-entity';
import { useLoanOffer, useLoanQuote, useTakeLoan } from './hook/use-credit';
import { formatDueDate, formatLoanAmount } from '../util/format';
import { LoanDisbursedSheet } from './widget/loan-disbursed-sheet';

const MINOR_SCALE = 100;

export function NewLoanScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();

  const [isDisbursedOpen, setIsDisbursedOpen] = useState(false);

  const offer = useLoanOffer();
  const offerCurrency = offer.data?.currency ?? '';
  const amount = useAmountDraft(
    isCurrencyCode(offerCurrency) ? offerCurrency : 'USD',
    i18n.language,
  );
  const principalMinor = Math.round(amount.value * MINOR_SCALE);
  const quote = useLoanQuote(principalMinor);
  const takeLoan = useTakeLoan();

  const offerTerms = offer.data ?? undefined;
  const isValid =
    offerTerms !== undefined &&
    isWithinOffer(principalMinor, offerTerms) &&
    quote.data !== undefined;

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
          title={t('credit.newLoan')}
          onBack={() => {
            navigation.goBack();
          }}
        />

        <VStack align="center" gap="xxs" paddingY="xl">
          <Text variant="body.m" color="secondary">
            {t('credit.loanAmount')}
          </Text>
          <Text variant="numeric.xl" numberOfLines={1}>
            {formatLoanAmount(principalMinor, offerTerms?.currency ?? '', i18n.language)}
          </Text>
        </VStack>

        {quote.data !== undefined && offerTerms !== undefined && (
          <DetailList
            items={[
              {
                label: t('credit.feeWithPercent', { percent: offerTerms.feePercent }),
                value: formatLoanAmount(quote.data.feeMinor, quote.data.currency, i18n.language),
              },
              {
                label: t('credit.youRepay'),
                value: formatLoanAmount(
                  quote.data.repayableMinor,
                  quote.data.currency,
                  i18n.language,
                ),
                emphasis: true,
              },
              {
                label: t('credit.dueDate'),
                value: formatDueDate(quote.data.dueDate, i18n.language),
              },
            ]}
          />
        )}

        <Button
          label={t('common.continue')}
          disabled={!isValid}
          isLoading={takeLoan.isPending}
          onPress={() => {
            takeLoan.mutate(principalMinor, {
              onSuccess: () => {
                setIsDisbursedOpen(true);
              },
            });
          }}
        />
      </VStack>

      {quote.data !== undefined && offerTerms !== undefined && (
        <LoanDisbursedSheet
          isOpen={isDisbursedOpen}
          quote={quote.data}
          feePercent={offerTerms.feePercent}
          locale={i18n.language}
          onClose={() => {
            setIsDisbursedOpen(false);
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
