import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useResolve } from '@/core/di/container-provider';
import type { TranslationKey } from '@/core/i18n/translation-key';
import { KycState } from '@/core/session/onboarding-gate';
import type { VerificationFailureReason } from '../../domain/entity/kyc-entity';

const FAILURE_COPY = {
  'session-expired': 'kyc.sessionExpired',
  'retry-blocked': 'kyc.retryBlocked',
  network: 'kyc.networkFailed',
  unknown: 'kyc.verificationFailed',
} as const satisfies Record<
  Exclude<VerificationFailureReason, 'camera-access-denied'>,
  TranslationKey
>;

type Options = {
  onCompleted?: (state: KycState) => void;
};

export function useKycVerification({ onCompleted }: Options = {}) {
  const { t } = useTranslation();
  const startVerification = useResolve('startVerificationUseCase');
  const appLockHold = useResolve('appLockHold');
  const [isStarting, setStarting] = useState(false);

  const start = useCallback(async () => {
    if (isStarting) return;
    setStarting(true);

    try {
      const release = appLockHold.hold();
      const result = await startVerification.execute().finally(release);

      if (!result.ok) {
        Alert.alert(t('kyc.sessionFailed'));
        return;
      }

      switch (result.value.type) {
        case 'completed':
          Alert.alert(
            result.value.state === KycState.Approved
              ? t('auth.accountVerifiedSuccessfully')
              : t('auth.accountVerificationInProgress'),
          );
          onCompleted?.(result.value.state);
          return;

        case 'cancelled':
          return;

        case 'failed':
          if (result.value.reason === 'camera-access-denied') {
            Alert.alert(t('kyc.cameraAccessTitle'), t('kyc.cameraAccessBody'), [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('common.openSettings'), onPress: () => void Linking.openSettings() },
            ]);
            return;
          }

          Alert.alert(t(FAILURE_COPY[result.value.reason]));
          return;
      }
    } finally {
      setStarting(false);
    }
  }, [isStarting, startVerification, appLockHold, onCompleted, t]);

  return { start, isStarting };
}
