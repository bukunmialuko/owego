import { useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Keyboard, StyleSheet } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { convert, identityQuote } from '@/core/fx/convert';
import { useFxQuote } from '@/core/fx/use-fx-quote';
import { formatMinor, isCurrencyCode, type CurrencyCode } from '@/core/money/money';
import { AmountKeypad, Button, Screen, ScreenHeader, Text, TextField, VStack } from '@/shared/ui';
import { maxAmountFor } from '../../domain/corridor/corridor-spec';
import { useTokenBalance } from '../hook/use-token-balance';
import { useTwoWayAmount } from '../hook/use-two-way-amount';
import { BalanceChip } from '../widget/balance-chip';
import { RecipientCard } from '../widget/recipient-card';
import { TwoWayAmountEntry } from '../widget/two-way-amount-entry';
import type { BankTransferParamList } from './bank-transfer-param-list';

const WALLET_CURRENCY = 'USD';
const MINOR_SCALE = 100;
const RATE_REFRESH_MS = 2 * 60_000;

export function AmountScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<BankTransferParamList>>();
  const { recipient, fundingToken, origin } =
    useRoute<RouteProp<BankTransferParamList, 'Amount'>>().params;

  const destination = asCurrencyCode(recipient.currency);
  const [narration, setNarration] = useState('');
  const [isNarrationFocused, setIsNarrationFocused] = useState(false);

  const rate = useFxQuote(WALLET_CURRENCY, recipient.currency, {
    refreshIntervalMs: RATE_REFRESH_MS,
  });
  const balance = useTokenBalance(fundingToken);
  const balanceMinor = balance.data?.amountMinor;

  const isConverted = recipient.currency !== WALLET_CURRENCY;
  const quote = isConverted ? rate.data : identityQuote(WALLET_CURRENCY);
  const hasRate = quote != null;

  const field = useTwoWayAmount({
    wallet: WALLET_CURRENCY,
    destination,
    quote,
    locale: i18n.language,
  });
  const { amount, typedCurrency, destinationMinor } = field;

  const ceiling = maxAmountFor(recipient.limits, recipient.values);
  const exceedsCeiling = ceiling !== undefined && destinationMinor > ceiling * MINOR_SCALE;
  const isReady = destinationMinor > 0 && hasRate && !exceedsCeiling;

  const shownBalance =
    balanceMinor === undefined
      ? undefined
      : formatMinor(
          typedCurrency === destination && quote != null
            ? convert(balanceMinor, quote)
            : balanceMinor,
          typedCurrency,
          i18n.language,
        );

  return (
    <Screen
      avoidsKeyboard
      footer={
        <VStack gap="md">
          {recipient.requiresNarration && (
            <TextField
              label={t('spend.narration')}
              placeholder={t('spend.narrationHint')}
              labelPlacement="inside"
              value={narration}
              onChangeText={setNarration}
              onFocus={() => {
                setIsNarrationFocused(true);
              }}
              onBlur={() => {
                setIsNarrationFocused(false);
              }}
            />
          )}

          {exceedsCeiling && ceiling !== undefined && (
            <Text accessibilityRole="alert" variant="caption.m" color="error" align="center">
              {t('spend.amountAboveMaximum', { maximum: ceiling })}
            </Text>
          )}

          {quote === null && (
            <Text accessibilityRole="alert" variant="caption.m" color="error" align="center">
              {t('spend.quoteUnavailable')}
            </Text>
          )}

          <Button
            label={t('common.continue')}
            disabled={!isReady}
            onPress={() => {
              Keyboard.dismiss();
              navigation.navigate('Confirm', {
                recipient,
                fundingToken,
                amountMinor: destinationMinor,
                narration: narration.trim(),
                origin,
              });
            }}
          />

          {!isNarrationFocused && (
            <AmountKeypad
              onKey={amount.press}
              allowDecimal={amount.allowDecimal}
              decimalLabel={t('common.decimalPoint')}
              deleteLabel={t('common.clear')}
            />
          )}
        </VStack>
      }
    >
      <VStack paddingX="lg" gap="lg" style={styles.body}>
        <ScreenHeader
          title={t('spend.send')}
          align="leading"
          onBack={() => {
            navigation.goBack();
          }}
          trailing={shownBalance === undefined ? undefined : <BalanceChip balance={shownBalance} />}
        />

        <RecipientCard
          title={recipient.displayName}
          subtitle={recipient.subtitle}
          accessibleValue={`${recipient.displayName}, ${recipient.subtitle}`}
        />

        <TwoWayAmountEntry
          field={field}
          wallet={WALLET_CURRENCY}
          destination={destination}
          quote={quote}
          destinationCountryCode={recipient.countryCode}
        />
      </VStack>
    </Screen>
  );
}

function asCurrencyCode(code: string): CurrencyCode {
  return isCurrencyCode(code) ? code : 'USD';
}

const styles = StyleSheet.create({
  body: { flex: 1 },
});
