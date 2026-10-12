import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { formatMinor } from '@/core/money/money';
import { useAmountDraft } from '@/core/money/use-amount-draft';
import {
  AmountDisplay,
  AmountKeypad,
  Button,
  Chip,
  HStack,
  Icon,
  Screen,
  ScreenHeader,
  Text,
  VStack,
} from '@/shared/ui';
import { validateTransferAmount } from '../../domain/usecase/validate-transfer-amount-usecase';
import { useSendableBalance } from './hook/use-sendable-balance';
import { AssetRecipientCard } from './widget/asset-recipient-card';
import type { DigitalAssetParamList } from './digital-asset-param-list';

const SHORTCUTS: (number | undefined)[] = [5, 10, 25, 50, undefined];

const CURRENCY = 'USD';

export function SendAmountScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<DigitalAssetParamList>>();
  const { recipient } = useRoute<RouteProp<DigitalAssetParamList, 'Amount'>>().params;

  const amount = useAmountDraft(CURRENCY, i18n.language);
  const balance = useSendableBalance(recipient.networkCode, recipient.tokenSymbol);
  const balanceMinor = balance.data ?? undefined;

  const validation = validateTransferAmount(amount.minor, balanceMinor);

  const problem = balance.isError
    ? t('spend.balanceUnavailable')
    : balance.isPending || amount.isPristine || validation.valid
      ? undefined
      : t(validation.problem.messageKey, validation.problem.values);

  return (
    <Screen
      footer={
        <VStack gap="md">
          <HStack gap="sm" justify="center" wrap>
            {SHORTCUTS.map((percent) => (
              <Chip
                key={percent ?? 'max'}
                tone="brandSubtle"
                label={percent === undefined ? t('spend.max') : `${percent}%`}
                accessibilityLabel={
                  percent === undefined ? t('spend.max') : t('spend.percentOfBalance', { percent })
                }
                onPress={() => {
                  if (balanceMinor === undefined) return;

                  amount.setMinor(
                    percent === undefined
                      ? balanceMinor
                      : Math.floor((balanceMinor * percent) / 100),
                  );
                }}
              />
            ))}
          </HStack>

          {problem !== undefined && (
            <Text accessibilityRole="alert" variant="caption.m" color="error" align="center">
              {problem}
            </Text>
          )}

          <Button
            label={t('common.continue')}
            disabled={!validation.valid}
            onPress={() => {
              navigation.navigate('Confirm', { recipient, amountMinor: amount.minor });
            }}
          />

          <AmountKeypad
            onKey={amount.press}
            allowDecimal={amount.allowDecimal}
            decimalLabel={t('common.decimalPoint')}
            deleteLabel={t('common.clear')}
          />
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
          trailing={
            balanceMinor === undefined ? undefined : (
              <Chip
                label={formatMinor(balanceMinor, CURRENCY, i18n.language)}
                accessibilityLabel={`${t('spend.balanceLabel')}, ${formatMinor(
                  balanceMinor,
                  CURRENCY,
                  i18n.language,
                )}`}
                leading={<Icon name="wallet-outline" size="sm" color="secondary" />}
              />
            )
          }
        />

        <AssetRecipientCard recipient={recipient} />

        <View style={styles.amount}>
          <AmountDisplay
            {...amount.formatted}
            accessibilityLabel={`${t('spend.amountLabel')}, ${formatMinor(
              amount.minor,
              CURRENCY,
              i18n.language,
            )}`}
          />
        </View>
      </VStack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  amount: { flex: 1, justifyContent: 'center' },
});
