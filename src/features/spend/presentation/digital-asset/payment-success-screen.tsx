import { StackActions, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Share, StyleSheet } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { formatMinorTrimmed } from '@/core/money/money';
import type { TranslationKey } from '@/core/i18n/translation-key';
import { Badge, Button, Gradient, Screen, ScreenHeader, Text, VStack } from '@/shared/ui';
import SuccessArt from '@/assets/illustrations/transaction-successful.svg';
import { AssetRecipientCard } from './widget/asset-recipient-card';
import { AssetTransferSummary } from './widget/asset-transfer-summary';
import type { SentOutcome } from '../../domain/entity/send-outcome';
import type { DigitalAssetParamList } from './digital-asset-param-list';

const HEADER_HEIGHT = 207;

const ART_WIDTH = 166;
const ART_HEIGHT = 66;

const CURRENCY = 'USD';

const RESULT: Record<SentOutcome, { title: TranslationKey; detail?: TranslationKey }> = {
  sent: { title: 'spend.transactionSuccessful' },
  processing: { title: 'spend.paymentProcessing', detail: 'spend.paymentProcessingDetail' },
  unconfirmed: { title: 'spend.paymentUnconfirmed', detail: 'spend.paymentUnconfirmedDetail' },
};

export function PaymentSuccessScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<DigitalAssetParamList>>();
  const { recipient, amountMinor, outcome } =
    useRoute<RouteProp<DigitalAssetParamList, 'Success'>>().params;

  const isSent = outcome === 'sent';
  const result = RESULT[outcome];
  const amount = formatMinorTrimmed(amountMinor, CURRENCY, i18n.language);

  function dismiss() {
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
                    address: recipient.address,
                    network: recipient.networkName,
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
          {isSent && <SuccessArt testID="payment-sent-art" width={ART_WIDTH} height={ART_HEIGHT} />}
          <Badge tone={isSent ? 'success' : 'warning'} size="md" label={t(result.title)} />
          <Text variant="display.2xl">{amount}</Text>
          {result.detail !== undefined && (
            <Text variant="body.m" color="secondary" align="center">
              {t(result.detail)}
            </Text>
          )}
        </VStack>

        <VStack gap="xs">
          <AssetRecipientCard recipient={recipient} variant="full" />
          <AssetTransferSummary
            amountMinor={amountMinor}
            tokenSymbol={recipient.tokenSymbol}
            locale={i18n.language}
          />
        </VStack>
      </VStack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  band: { left: 0, position: 'absolute', right: 0, top: 0 },
});
