import { useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { AwilixContainer } from 'awilix';
import { useContainer } from '@/core/di/container-provider';
import type { AppCradle } from '@/core/di/container';

export function useChangePin() {
  const { t } = useTranslation();
  const container = useContainer();

  const isRunning = useRef(false);

  const start = useCallback(async () => {
    if (isRunning.current) return;
    isRunning.current = true;

    try {
      const port = resolvePin(container);

      if (port === undefined) {
        Alert.alert(t('profile.changePinFailed'));
        return;
      }

      const result = await port.changePin();

      if (!result.ok) {
        Alert.alert(t(result.error.titleKey));
        return;
      }

      switch (result.value.type) {
        case 'changed':
          Alert.alert(t('profile.pinChangedSuccessfully'));
          return;
        case 'cancelled':
          return;
        case 'expired':
          Alert.alert(t('profile.challengeExpired'));
          return;
        case 'failed':
          Alert.alert(t('profile.changePinFailed'));
          return;
      }
    } finally {
      isRunning.current = false;
    }
  }, [container, t]);

  return { start };
}

function resolvePin(container: AwilixContainer<AppCradle>) {
  try {
    return container.resolve('settingsPinPort');
  } catch {
    return undefined;
  }
}
