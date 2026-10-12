import { useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import type { AwilixContainer } from 'awilix';
import { useContainer } from '@/core/di/container-provider';
import type { AppCradle } from '@/core/di/container';
import { KycState, toKycState } from '@/core/session/onboarding-gate';

export function useStartVerification() {
  const { t } = useTranslation();
  const container = useContainer();
  const queryClient = useQueryClient();
  const isRunning = useRef(false);

  const start = useCallback(async () => {
    if (isRunning.current) return;
    isRunning.current = true;

    try {
      const port = resolveVerification(container);

      if (port === undefined) {
        Alert.alert(t('kyc.sessionFailed'));
        return;
      }

      const result = await port.start();

      if (!result.ok) {
        Alert.alert(t('kyc.sessionFailed'));
        return;
      }

      if (result.value.type === 'cancelled') return;

      if (result.value.type === 'failed') {
        Alert.alert(t('kyc.verificationFailed'));
        return;
      }

      Alert.alert(
        toKycState(result.value.state) === KycState.Approved
          ? t('auth.accountVerifiedSuccessfully')
          : t('auth.accountVerificationInProgress'),
      );

      await queryClient.invalidateQueries({ queryKey: ['settings', 'profile'] });
    } finally {
      isRunning.current = false;
    }
  }, [container, queryClient, t]);

  return { start };
}

function resolveVerification(container: AwilixContainer<AppCradle>) {
  try {
    return container.resolve('settingsVerificationPort');
  } catch {
    return undefined;
  }
}
