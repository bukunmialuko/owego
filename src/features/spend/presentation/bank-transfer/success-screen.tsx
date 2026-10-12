import { StackActions, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Share, StyleSheet } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { convert } from '@/core/fx/convert';
import { formatMinor, formatMinorTrimmed } from '@/core/money/money';
import { walletsQueryKey } from '@/core/wallet/use-wallets-query';
import type { TranslationKey } from '@/core/i18n/translation-key';
import {
  AssetMark,
  Avatar,
  Badge,
  Button,
  Gradient,
  Screen,
  ScreenHeader,
  Text,
  VStack,
} from '@/shared/ui';
import SuccessArt from '@/assets/illustrations/transaction-successful.svg';
import type { SentOutcome } from '../../domain/entity/send-outcome';
import { RecipientCard } from '../widget/recipient-card';
import { recipientName } from '../widget/recipient-name';
import { TransferSummary } from '../widget/transfer-summary';
import type { BankTransferParamList } from './bank-transfer-param-list';

const HEADER_HEIGHT = 207;
const ART_WIDTH = 166;
const ART_HEIGHT = 66;
const WALLET_CURRENCY = 'USD';
const MINOR_SCALE = 100;

const RESULT: Record<SentOutcome, { title: TranslationKey; detail?: TranslationKey }> = {
  sent: { title: 'spend.transactionSuccessful' },
  processing: { title: 'spend.paymentProcessing', detail: 'spend.paymentProcessingDetail' },
  unconfirmed: { title: 'spend.paymentUnconfirmed', detail: 'spend.paymentUnconfirmedDetail' },
};

export function SuccessScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<BankTransferParamList>>();
  const queryClient = useQueryClient();
  const { recipient, quote, outcome } =
    useRoute<RouteProp<BankTransferParamList, 'Success'>>().params;

  const isSent = outcome === 'sent';
  const result = RESULT[outcome];
  const { destination, wallet } = quote;
  const isConverted = destination.currency !== WALLET_CURRENCY;

  const amount = formatMinorTrimmed(
    destination.recipientGetsMinor,
    destination.currency,
    i18n.language,
  );

  function dismiss() {
    void queryClient.invalidateQueries({ queryKey: walletsQueryKey });
    navigation.getParent()?.dispatch(StackActions.popToTop());
  }

  return (
    <Screen
      scroll
      clampsOverscroll
      {...(isSent
        ? {
            backdrop: (
              <Gradient name="successHeader" style={[styles.band, { height: HEADER_HEIGHT }]} />
            ),
          }
        : {})}
      footer={
        <VStack gap="sm">
          {isSent && (
            <Button
              label={t('spend.shareReceipt')}
              onPress={() => {
                void Share.share({
                  message: t('spend.shareReceiptMessage', {
                    amount,
                    address: recipientName(recipient, t),
                    network: recipient.subtitle,
                  }),
                });
              }}
            />
          )}
          <Button
            variant={isSent ? 'secondary' : 'primary'}
            label={t('common.done')}
            onPress={dismiss}
          />
        </VStack>
      }
    >
      <VStack paddingX="lg" gap="xl">
        <ScreenHeader closePosition="leading" tone="surface" onClose={dismiss} />

        <VStack align="center" gap="lg">
          {isSent && <SuccessArt width={ART_WIDTH} height={ART_HEIGHT} />}
          <Badge tone={isSent ? 'success' : 'warning'} size="md" label={t(result.title)} />
          <Text variant="display.2xl">{amount}</Text>
          {isConverted && (
            <Text variant="heading.h5" color="secondary">
              {formatMinor(wallet.recipientGetsMinor, WALLET_CURRENCY, i18n.language)}
            </Text>
          )}
          {result.detail !== undefined && (
            <Text variant="body.m" color="secondary" align="center">
              {t(result.detail)}
            </Text>
          )}
        </VStack>

        <VStack gap="xxs">
          <RecipientCard
            variant="full"
            title={recipientName(recipient, t)}
            subtitle={recipient.subtitle}
            accessibleValue={`${recipientName(recipient, t)}, ${recipient.subtitle}`}
            mark={
              recipient.displayName === '' ? (
                <AssetMark symbol={recipient.currency} badgeCountryCode={recipient.countryCode} />
              ) : (
                <Avatar name={recipient.displayName} size="lg" />
              )
            }
          />

          <TransferSummary
            quote={destination}
            locale={i18n.language}
            {...(isConverted
              ? {
                  inWallet: wallet,
                  rateLine: t('spend.fxRateLine', {
                    base: formatMinor(MINOR_SCALE, WALLET_CURRENCY, i18n.language),
                    quote: formatMinor(
                      convert(MINOR_SCALE, {
                        baseCurrency: WALLET_CURRENCY,
                        quoteCurrency: destination.currency,
                        rate: quote.rate,
                      }),
                      destination.currency,
                      i18n.language,
                    ),
                  }),
                }
              : {})}
          />
        </VStack>
      </VStack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  band: { left: 0, position: 'absolute', right: 0, top: 0 },
});
