import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import { convert } from '@/core/fx/convert';
import type { FxQuote } from '@/core/fx/fx-rate';
import { formatMinor, formatMinorTrimmed, type CurrencyCode } from '@/core/money/money';
import { AmountDisplay, Chip, CountryFlag, HStack, Skeleton } from '@/shared/ui';
import type { TwoWayAmountField } from '../hook/use-two-way-amount';
import { CurrencySwitch } from './currency-switch';

const WALLET_COUNTRY = 'US';
const MINOR_SCALE = 100;
const FLAG_DIAMETER = 20;
const RATE_PLACEHOLDER_WIDTH = '40%';

type Props = {
  field: TwoWayAmountField;
  wallet: CurrencyCode;
  destination: CurrencyCode;
  quote: FxQuote | null | undefined;
  destinationCountryCode: string;
  above?: ReactNode;
};

export function TwoWayAmountEntry({
  field,
  wallet,
  destination,
  quote,
  destinationCountryCode,
  above,
}: Props) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { amount, typedCurrency, counterpart } = field;
  const isConverted = wallet !== destination;

  const rateLine =
    quote == null
      ? undefined
      : t('spend.fxRateLine', {
          base: formatMinorTrimmed(MINOR_SCALE, wallet, i18n.language),
          quote: formatMinorTrimmed(convert(MINOR_SCALE, quote), destination, i18n.language),
        });

  return (
    <View style={styles.amount}>
      {above !== undefined && (
        <HStack justify="center" paddingBottom="xl">
          {above}
        </HStack>
      )}

      <HStack>
        {isConverted && <View style={{ width: theme.size.control.md }} />}

        <View style={styles.figure}>
          <AmountDisplay
            {...amount.formatted}
            accessibilityLabel={`${t('spend.amountLabel')}, ${formatMinor(
              field.typedApiMinor,
              typedCurrency,
              i18n.language,
            )}`}
          />
        </View>

        {isConverted && (
          <CurrencySwitch
            currency={typedCurrency}
            label={t('spend.switchCurrency', { currency: field.otherCurrency })}
            disabled={!field.canSwitch}
            onPress={field.switchCurrency}
          />
        )}
      </HStack>

      {isConverted && quote !== null && (
        <HStack justify="center" paddingTop="lg">
          {quote === undefined || rateLine === undefined ? (
            <Skeleton width={RATE_PLACEHOLDER_WIDTH} height={theme.size.control.sm} radius="pill" />
          ) : amount.isPristine || counterpart === undefined ? (
            <Chip
              label={rateLine}
              accessibilityLabel={`${t('spend.rate')}, ${rateLine}`}
              leading={<CountryFlag code={destinationCountryCode} diameter={FLAG_DIAMETER} />}
            />
          ) : (
            <Chip
              label={formatMinor(counterpart.minor, counterpart.currency, i18n.language)}
              leading={
                <CountryFlag
                  code={counterpart.currency === wallet ? WALLET_COUNTRY : destinationCountryCode}
                  diameter={FLAG_DIAMETER}
                />
              }
            />
          )}
        </HStack>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  amount: { flex: 1, justifyContent: 'center' },
  figure: { flex: 1 },
});
