import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/core/design-system/theme-provider';
import { Button, IconCircle, Screen, Text, VStack } from '@/shared/ui';
import { useOnboardingExit } from '@/core/session/use-onboarding-exit';
import { useWalletSetup } from './hook/use-wallet-setup';
import { FinishLaterSheet } from './widget/finish-later-sheet';

export function CreateWalletScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { phase, start, isBusy } = useWalletSetup();
  const exit = useOnboardingExit();

  return (
    <Screen panHandlers={exit.panHandlers}>
      <VStack style={styles.container} justify="space-between" paddingX="lg" paddingY="lg">
        <View />

        <VStack gap="sm" align="center">
          <IconCircle tone="brand" icon="wallet" size="lg" />
          <Text variant="display.l" align="center">
            {t('auth.setupWalletTitle')}
          </Text>
          <Text variant="body.m" color="secondary" align="center">
            {t('auth.setupWalletDescription')}
          </Text>
        </VStack>

        {phase === 'checking' ? (
          <View accessibilityRole="progressbar" accessibilityLabel={t('wallet.checkingLabel')}>
            <ActivityIndicator color={theme.color.fillBrand} />
          </View>
        ) : (
          <VStack gap="sm">
            <Button label={t('common.start')} isLoading={isBusy} onPress={() => void start()} />
            <Button variant="secondary" label={t('kyc.skipForNow')} onPress={exit.open} />
          </VStack>
        )}
      </VStack>

      <FinishLaterSheet exit={exit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
