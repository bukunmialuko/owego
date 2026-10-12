import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TranslationKey } from '@/core/i18n/translation-key';
import { useOnboardingExit } from '@/core/session/use-onboarding-exit';
import {
  Button,
  IconCircle,
  LoadingAnimation,
  Screen,
  Text,
  VStack,
  useContactSupport,
} from '@/shared/ui';
import { useWalletProvisioning, type ProvisioningView } from './hook/use-wallet-provisioning';
import { FinishLaterSheet } from './widget/finish-later-sheet';

const SIZE_RATIO = 0.25;

export function WalletProvisioningScreen() {
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const { view, checkAgain } = useWalletProvisioning();
  const exit = useOnboardingExit();
  const contactSupport = useContactSupport();
  const copy = copyFor(view);

  return (
    <Screen panHandlers={exit.panHandlers}>
      <VStack style={styles.container} justify="space-between" paddingX="lg" paddingY="lg">
        <View />

        <VStack gap="sm" align="center">
          {view.phase === 'waiting' ? (
            <LoadingAnimation
              size={height * SIZE_RATIO}
              accessibilityLabel={t('wallet.provisioningLabel')}
            />
          ) : (
            <IconCircle
              tone={view.phase === 'failed' ? 'error' : 'warning'}
              icon={view.phase === 'failed' ? 'alert-circle-outline' : 'time-outline'}
              size="lg"
            />
          )}
          <Text variant="display.l" align="center" accessibilityRole="header">
            {t(copy.title)}
          </Text>
          <Text variant="body.m" color="secondary" align="center">
            {t(copy.body)}
          </Text>
        </VStack>

        {view.phase === 'waiting' ? (
          <View />
        ) : (
          <VStack gap="sm">
            <Button label={t('wallet.checkAgain')} onPress={checkAgain} />
            {view.phase === 'failed' && (
              <Button
                variant="secondary"
                label={t('common.contactSupport')}
                onPress={() => void contactSupport()}
              />
            )}
            <Button variant="ghost" label={t('kyc.skipForNow')} onPress={exit.open} />
          </VStack>
        )}
      </VStack>

      <FinishLaterSheet exit={exit} />
    </Screen>
  );
}

function copyFor(view: ProvisioningView): { title: TranslationKey; body: TranslationKey } {
  switch (view.phase) {
    case 'waiting':
      return { title: 'wallet.provisioningLabel', body: waitingBody(view.progress) };
    case 'stalled':
      return { title: 'wallet.provisioningStalledTitle', body: 'wallet.provisioningStalledBody' };
    case 'failed':
      return { title: 'wallet.provisioningFailedTitle', body: 'wallet.provisioningFailedBody' };
  }
}

function waitingBody(progress: Extract<ProvisioningView, { phase: 'waiting' }>['progress']) {
  switch (progress) {
    case 'checking':
      return 'wallet.provisioningBody';
    case 'slow':
      return 'wallet.provisioningSlowBody';
    case 'reconnecting':
      return 'wallet.provisioningReconnectingBody';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
