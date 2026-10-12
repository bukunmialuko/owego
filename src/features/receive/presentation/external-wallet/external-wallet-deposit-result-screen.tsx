import { StackActions, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useResolve } from '@/core/di/container-provider';
import type { TranslationKey } from '@/core/i18n/translation-key';
import { formatMinor } from '@/core/money/money';
import { solscanTransactionUrl } from '@/core/reference-data/explorer';
import {
  Badge,
  Button,
  openInAppBrowser,
  Screen,
  ScreenHeader,
  Text,
  VStack,
  type BadgeTone,
} from '@/shared/ui';
import { useDepositConfirmation } from './hook/use-deposit-confirmation';
import type { ExternalWalletDepositParamList } from './external-wallet-deposit-param-list';

const CURRENCY = 'USD';

type Ending = 'confirming' | 'confirmed' | 'submitted' | 'failed' | 'unconfirmed';

const ENDING: Record<Ending, { title: TranslationKey; detail?: TranslationKey; tone: BadgeTone }> =
  {
    confirming: { title: 'receive.externalWallet.confirming', tone: 'neutral' },
    confirmed: {
      title: 'receive.externalWallet.confirmed',
      detail: 'receive.externalWallet.confirmedDetail',
      tone: 'success',
    },
    submitted: {
      title: 'receive.externalWallet.submitted',
      detail: 'receive.externalWallet.submittedDetail',
      tone: 'warning',
    },
    failed: {
      title: 'receive.externalWallet.failed',
      detail: 'receive.externalWallet.failedDetail',
      tone: 'error',
    },
    unconfirmed: {
      title: 'receive.externalWallet.unconfirmed',
      detail: 'receive.externalWallet.unconfirmedDetail',
      tone: 'warning',
    },
  };

export function ExternalWalletDepositResultScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<ExternalWalletDepositParamList>>();
  const { amountMinor, tokenSymbol, signature } =
    useRoute<RouteProp<ExternalWalletDepositParamList, 'Result'>>().params;
  const { solanaCluster } = useResolve('config');

  const confirmation = useDepositConfirmation(signature);
  const ending: Ending =
    signature === null
      ? 'unconfirmed'
      : confirmation.isPending
        ? 'confirming'
        : confirmation.data === 'confirmed'
          ? 'confirmed'
          : confirmation.data === 'failed'
            ? 'failed'
            : 'submitted';
  const { title, detail, tone } = ENDING[ending];
  const explorerUrl =
    signature === null ? undefined : solscanTransactionUrl(signature, solanaCluster);

  function dismiss() {
    (navigation.getParent() ?? navigation).dispatch(StackActions.popToTop());
  }

  return (
    <Screen
      scroll
      footer={
        <VStack gap="sm">
          {explorerUrl !== undefined && (
            <Button
              variant="secondary"
              label={t('receive.externalWallet.viewOnSolscan')}
              onPress={() => {
                void openInAppBrowser(explorerUrl);
              }}
            />
          )}
          <Button label={t('common.done')} onPress={dismiss} />
        </VStack>
      }
    >
      <VStack paddingX="lg" gap="xl">
        <ScreenHeader closePosition="leading" onClose={dismiss} />

        <VStack align="center" gap="lg">
          <Badge tone={tone} size="md" label={t(title)} />
          <Text variant="display.xl" align="center">
            {t('receive.externalWallet.amountOfToken', {
              amount: formatMinor(amountMinor, CURRENCY, i18n.language),
              token: tokenSymbol,
            })}
          </Text>
          {detail !== undefined && (
            <Text variant="body.m" color="secondary" align="center">
              {t(detail, { token: tokenSymbol })}
            </Text>
          )}
        </VStack>
      </VStack>
    </Screen>
  );
}
