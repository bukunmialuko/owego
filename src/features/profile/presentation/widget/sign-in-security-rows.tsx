import { useCallback, useState } from 'react';
import type { AwilixContainer } from 'awilix';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { AppCradle } from '@/core/di/container';
import { useContainer } from '@/core/di/container-provider';
import type { TranslationKey } from '@/core/i18n/translation-key';
import { Switch } from '@/shared/ui';
import type { SettingsSecurity } from '../../domain/port/settings-security-port';
import { SettingsRow } from './settings-row';

function resolveSecurity(container: AwilixContainer<AppCradle>) {
  try {
    return container.resolve('settingsSecurityPort');
  } catch {
    return undefined;
  }
}

const NOTHING_SEALED: SettingsSecurity = {
  pin: false,
  biometrics: false,
  device: { type: 'unavailable' },
};

function biometricHold(security: SettingsSecurity): TranslationKey | undefined {
  if (security.biometrics) return undefined;
  if (!security.pin) return 'profile.biometricNeedsPin';

  switch (security.device.type) {
    case 'available':
      return undefined;
    case 'unavailable':
      return 'profile.biometricUnavailable';
    case 'not-enrolled':
      return 'profile.biometricNotEnrolled';
  }
}

export function SignInSecurityRows() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const container = useContainer();
  const [security, setSecurity] = useState<SettingsSecurity>(NOTHING_SEALED);

  useFocusEffect(
    useCallback(() => {
      let isCurrent = true;
      const port = resolveSecurity(container);
      if (port === undefined) return;

      void port.read().then((next) => {
        if (isCurrent) setSecurity(next);
      });

      return () => {
        isCurrent = false;
      };
    }, [container]),
  );

  const turnPinOff = useCallback(async () => {
    const port = resolveSecurity(container);
    if (port === undefined) return;

    if (!security.biometrics) {
      navigation.navigate('SignInPin', { mode: 'disable-pin' });
      return;
    }

    const result = await port.disablePin({});
    if (!result.ok || result.value.type === 'challenge-failed') {
      navigation.navigate('SignInPin', { mode: 'disable-pin' });
      return;
    }

    setSecurity(await port.read());
  }, [container, navigation, security.biometrics]);

  const turnBiometricsOff = useCallback(async () => {
    const port = resolveSecurity(container);
    if (port === undefined) return;

    await port.disableBiometrics();
    setSecurity(await port.read());
  }, [container]);

  const hold = biometricHold(security);

  return (
    <>
      <SettingsRow
        icon="keypad-outline"
        title={t('profile.pinSignIn')}
        trailingNode={
          <Switch
            checked={security.pin}
            label={t('profile.pinSignIn')}
            onChange={(next) => {
              if (next) {
                navigation.navigate('SignInPin', { mode: 'enable-pin' });
                return;
              }

              void turnPinOff();
            }}
          />
        }
      />
      <SettingsRow
        icon="finger-print"
        title={t('profile.biometricSignIn')}
        {...(hold === undefined ? {} : { subtitle: t(hold) })}
        trailingNode={
          <Switch
            checked={security.biometrics}
            disabled={hold !== undefined}
            label={t('profile.biometricSignIn')}
            onChange={(next) => {
              if (next) {
                navigation.navigate('SignInPin', { mode: 'enable-biometrics' });
                return;
              }

              void turnBiometricsOff();
            }}
          />
        }
      />
    </>
  );
}
