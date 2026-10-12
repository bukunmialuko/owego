import { useMemo, useState, type ReactNode } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/core/design-system/theme-provider';
import { convert, identityQuote } from '@/core/fx/convert';
import type { FxQuote } from '@/core/fx/fx-rate';
import { priceTwoWay } from '@/core/fx/two-way-amount';
import { useFxQuote } from '@/core/fx/use-fx-quote';
import { formatDraft, fromMinor } from '@/core/money/amount-draft';
import {
  apiMinorToField,
  fieldMinorToApi,
  formatMinor,
  fractionDigitsFor,
  isCurrencyCode,
  type CurrencyCode,
} from '@/core/money/money';
import { useAmountDraft } from '@/core/money/use-amount-draft';
import {
  AmountDisplay,
  AmountKeypad,
  Banner,
  Button,
  Chip,
  CountryFlag,
  HStack,
  Screen,
  ScreenHeader,
  Skeleton,
  Text,
  VStack,
} from '@/shared/ui';
import { resolveFundingToken } from '../../domain/asset/funding-token';
import type { SendableToken } from '../../domain/asset/send-networks';
import type { UnsupportedReason } from '../../domain/scan/scan-outcome';
import { payoutCurrencies } from '../../domain/corridor/registry';
import { checkMerchantAmount } from '../../domain/usecase/check-merchant-amount-usecase';
import {
  resolveMerchantCode,
  type MerchantResolution,
} from '../../domain/usecase/resolve-merchant-code-usecase';
import { usePayoutFundingOptions } from '../hook/use-payout-funding-options';
import { useTokenBalance } from '../hook/use-token-balance';
import { useTwoWayAmount } from '../hook/use-two-way-amount';
import { UNSUPPORTED_MESSAGE } from '../scan/unsupported-message';
import { BalanceChip } from '../widget/balance-chip';
import { RecipientCard } from '../widget/recipient-card';
import { recipientName } from '../widget/recipient-name';
import { TokenPicker } from '../widget/token-picker';
import { TwoWayAmountEntry } from '../widget/two-way-amount-entry';
import type { BankTransferParamList } from './bank-transfer-param-list';

const WALLET_CURRENCY = 'USD';
const RATE_REFRESH_MS = 2 * 60_000;
const FLAG_DIAMETER = 20;
const ESTIMATE_PLACEHOLDER_WIDTH = '60%';
const UNHELD_FALLBACK_TOKEN: SendableToken = 'USDC';

type Merchant = Extract<MerchantResolution, { kind: 'merchant' }>;
type Navigation = NativeStackNavigationProp<BankTransferParamList>;

export function MerchantAmountScreen() {
  const { qrString, fundingToken } =
    useRoute<RouteProp<BankTransferParamList, 'MerchantAmount'>>().params;
  const resolved = useMemo(() => resolveMerchantCode(qrString), [qrString]);

  return resolved.kind === 'merchant' ? (
    <PayMerchant merchant={resolved} chosenToken={fundingToken} />
  ) : (
    <UnpayableCode reason={resolved.reason} currencyName={resolved.currencyName ?? ''} />
  );
}

function PayMerchant({
  merchant,
  chosenToken,
}: {
  merchant: Merchant;
  chosenToken: string | undefined;
}) {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const { recipient, amountMinor: fixedMinor } = merchant;
  const destination = asCurrencyCode(recipient.currency);

  const funding = usePayoutFundingOptions();
  const [picked, setPicked] = useState(chosenToken);
  const heldToken = resolveFundingToken(funding.options, picked);
  const fundingToken = heldToken ?? UNHELD_FALLBACK_TOKEN;
  const balanceMinor = useTokenBalance(fundingToken).data?.amountMinor;

  const rate = useFxQuote(WALLET_CURRENCY, recipient.currency, {
    refreshIntervalMs: RATE_REFRESH_MS,
  });
  const isConverted = recipient.currency !== WALLET_CURRENCY;
  const quote = !isConverted
    ? identityQuote(WALLET_CURRENCY)
    : rate.isError && rate.data === undefined
      ? null
      : rate.data;

  const field = useTwoWayAmount({
    wallet: WALLET_CURRENCY,
    destination,
    quote,
    locale: i18n.language,
  });
  const { amount, typedCurrency, destinationMinor } = field;

  const typesLocally = fixedMinor === undefined && quote === null;
  const local = useAmountDraft(destination, i18n.language);
  const typedMinor = typesLocally ? fieldMinorToApi(local.minor, destination) : destinationMinor;

  const amountMinor = fixedMinor ?? typedMinor;
  const check = checkMerchantAmount(amountMinor, recipient.currency);
  const isReady = amountMinor > 0 && check.kind === 'payable';
  const minimum =
    check.kind === 'belowMinimum'
      ? formatMinor(check.minimumMinor, destination, i18n.language)
      : undefined;

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

  const name = recipientName(recipient, t);
  const tokenPicker = (
    <TokenPicker
      options={funding.options}
      selected={heldToken}
      isPending={funding.isPending}
      isError={funding.isError}
      onRetry={funding.retry}
      onSelect={setPicked}
    />
  );

  return (
    <Screen
      footer={
        <VStack gap="md">
          {minimum !== undefined && amountMinor > 0 && (
            <Text accessibilityRole="alert" variant="caption.m" color="error" align="center">
              {fixedMinor === undefined
                ? t('spend.amountBelowMinimum', { minimum })
                : t('spend.merchant.belowMinimum', { minimum })}
            </Text>
          )}

          <Button
            label={t('common.continue')}
            disabled={!isReady}
            onPress={() => {
              navigation.navigate('Confirm', {
                recipient,
                fundingToken,
                amountMinor,
                narration: '',
                origin: 'scan',
              });
            }}
          />

          {fixedMinor === undefined && (
            <AmountKeypad
              onKey={typesLocally ? local.press : amount.press}
              allowDecimal={typesLocally ? local.allowDecimal : amount.allowDecimal}
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
          title={name}
          subtitle={recipient.subtitle}
          accessibleValue={`${name}, ${recipient.subtitle}`}
        />

        {typesLocally ? (
          <View style={styles.amount}>
            <HStack justify="center" paddingBottom="xl">
              {tokenPicker}
            </HStack>
            <Text variant="body.m" color="secondary" align="center">
              {t('spend.merchant.enterIn', { currency: currencyNameOf(recipient.currency) })}
            </Text>
            <AmountDisplay
              {...local.formatted}
              accessibilityLabel={`${t('spend.amountLabel')}, ${formatMinor(
                typedMinor,
                destination,
                i18n.language,
              )}`}
            />
          </View>
        ) : fixedMinor === undefined ? (
          <TwoWayAmountEntry
            field={field}
            wallet={WALLET_CURRENCY}
            destination={destination}
            quote={quote}
            destinationCountryCode={recipient.countryCode}
            above={tokenPicker}
          />
        ) : (
          <FixedAmount
            amountMinor={fixedMinor}
            currency={destination}
            countryCode={recipient.countryCode}
            quote={quote}
            above={tokenPicker}
          />
        )}
      </VStack>
    </Screen>
  );
}

function FixedAmount({
  amountMinor,
  currency,
  countryCode,
  quote,
  above,
}: {
  amountMinor: number;
  currency: CurrencyCode;
  countryCode: string;
  quote: FxQuote | null | undefined;
  above: ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const local = formatMinor(amountMinor, currency, i18n.language);
  const estimateMinor =
    quote == null
      ? undefined
      : priceTwoWay({ currency, minor: amountMinor }, quote).counterpart.minor;
  const isConverted = currency !== WALLET_CURRENCY;

  return (
    <View style={styles.amount}>
      <HStack justify="center" paddingBottom="xl">
        {above}
      </HStack>

      <VStack gap="sm">
        <Text variant="body.m" color="secondary" align="center">
          {t('spend.merchant.amountToPay')}
        </Text>

        {quote === undefined && isConverted ? (
          <HStack justify="center">
            <Skeleton
              width={ESTIMATE_PLACEHOLDER_WIDTH}
              height={theme.size.control.lg}
              radius="md"
            />
          </HStack>
        ) : estimateMinor === undefined || !isConverted ? (
          <FigureOf minor={amountMinor} currency={currency} />
        ) : (
          <FigureOf minor={estimateMinor} currency={WALLET_CURRENCY} />
        )}
      </VStack>

      {isConverted && quote !== null && (
        <HStack justify="center" paddingTop="lg">
          <Chip
            label={local}
            leading={<CountryFlag code={countryCode} diameter={FLAG_DIAMETER} />}
          />
        </HStack>
      )}
    </View>
  );
}

function FigureOf({ minor, currency }: { minor: number; currency: CurrencyCode }) {
  const { t, i18n } = useTranslation();
  const formatted = formatDraft(
    fromMinor(apiMinorToField(minor, currency), fractionDigitsFor(currency)),
    i18n.language,
    currency,
  );

  return (
    <AmountDisplay
      {...formatted}
      accessibilityLabel={`${t('spend.merchant.amountToPay')}, ${formatMinor(
        minor,
        currency,
        i18n.language,
      )}`}
    />
  );
}

function UnpayableCode({
  reason,
  currencyName,
}: {
  reason: UnsupportedReason;
  currencyName: string;
}) {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();

  function leave() {
    navigation.goBack();
  }

  return (
    <Screen footer={<Button label={t('common.close')} onPress={leave} />}>
      <VStack paddingX="lg" gap="lg">
        <ScreenHeader title={t('spend.send')} align="leading" onBack={leave} />
        <Banner
          tone="warning"
          message={t(UNSUPPORTED_MESSAGE[reason], { currency: currencyName })}
        />
      </VStack>
    </Screen>
  );
}

function currencyNameOf(code: string): string {
  return payoutCurrencies().find((currency) => currency.code === code)?.name ?? code;
}

function asCurrencyCode(code: string): CurrencyCode {
  return isCurrencyCode(code) ? code : 'USD';
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  amount: { flex: 1, justifyContent: 'center' },
});
