import { useEffect, useState } from 'react';
import {
  useNavigation,
  usePreventRemove,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useResolve } from '@/core/di/container-provider';
import type { TranslationKey } from '@/core/i18n/translation-key';
import type { AppStackParamList } from '@/navigation/param-list';
import { BiometricOffer, PinEntryLayout, usePinSetup, type PinSetupResult } from '@/shared/ui';
import type {
  SettingsBiometricKind,
  SettingsPinProblem,
} from '../domain/port/settings-security-port';

const PROBLEM_COPY = {
  'wrong-length': 'auth.pinTooShort',
  'not-numeric': 'auth.pinNotNumeric',
  repeated: 'auth.pinRepeated',
  consecutive: 'auth.pinConsecutive',
} as const satisfies Record<SettingsPinProblem, TranslationKey>;

export function SignInPinScreen() {
  const { mode } = useRoute<RouteProp<AppStackParamList, 'SignInPin'>>().params;

  switch (mode) {
    case 'enable-pin':
      return <EnablePinSignIn />;
    case 'disable-pin':
      return <DisablePinSignIn />;
    case 'enable-biometrics':
      return <EnableBiometrics />;
  }
}

function EnablePinSignIn() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const security = useResolve('settingsSecurityPort');
  const [isPinOn, setPinOn] = useState(false);
  const [isFinished, setFinished] = useState(false);
  const [offer, setOffer] = useState<{ pin: string; kind: SettingsBiometricKind } | undefined>(
    undefined,
  );
  const [isAddingBiometrics, setAddingBiometrics] = useState(false);

  const setup = usePinSetup({
    mismatchMessage: t('pin.mismatch'),
    onSubmit: async (pin): Promise<PinSetupResult> => {
      const result = await security.enablePin(pin);
      if (!result.ok) return { type: 'retry', message: t('errors.common.unknown') };

      switch (result.value.type) {
        case 'enabled': {
          setPinOn(true);
          const { device } = await security.read();
          if (device.type === 'available') setOffer({ pin, kind: device.kind });
          else setFinished(true);
          return { type: 'done' };
        }
        case 'rejected':
          return { type: 'restart', message: t(PROBLEM_COPY[result.value.problem]) };
      }
    },
  });

  usePreventRemove((setup.step === 'confirm' && !isPinOn) || isAddingBiometrics, () => {
    if (!isPinOn) setup.back();
  });

  useEffect(() => {
    if (isFinished) navigation.goBack();
  }, [isFinished, navigation]);

  if (offer !== undefined) {
    return (
      <BiometricOffer
        kind={offer.kind}
        isBusy={isAddingBiometrics}
        onEnable={() => {
          setAddingBiometrics(true);
          void security.enableBiometrics(offer.pin).finally(() => {
            setAddingBiometrics(false);
            setFinished(true);
          });
        }}
        onDecline={() => {
          setFinished(true);
        }}
      />
    );
  }

  const isCreating = setup.step === 'create';

  return (
    <PinEntryLayout
      title={isCreating ? t('pin.createTitle') : t('pin.confirmTitle')}
      subtitle={isCreating ? t('pin.createSubtitle') : t('pin.confirmSubtitle')}
      pin={setup.pin}
      onChangePin={setup.setPin}
      {...(setup.message === undefined ? {} : { message: setup.message })}
      submitLabel={t('common.continue')}
      onSubmit={() => {
        void setup.submit();
      }}
      isBusy={setup.isBusy}
      onBack={() => {
        if (!setup.back()) navigation.goBack();
      }}
    />
  );
}

type CurrentPinAnswer = { type: 'done' } | { type: 'refused'; message: string } | { type: 'stay' };

function DisablePinSignIn() {
  const { t } = useTranslation();
  const security = useResolve('settingsSecurityPort');

  return (
    <CurrentPinPad
      subtitle={t('profile.disablePinSignInSubtitle')}
      onSubmit={async (pin) => {
        const result = await security.disablePin({ pin });
        if (!result.ok) return { type: 'refused', message: t('errors.common.unknown') };

        switch (result.value.type) {
          case 'disabled':
            return { type: 'done' };
          case 'challenge-failed':
            return { type: 'refused', message: t('auth.wrongPin') };
        }
      }}
    />
  );
}

function EnableBiometrics() {
  const { t } = useTranslation();
  const security = useResolve('settingsSecurityPort');

  return (
    <CurrentPinPad
      subtitle={t('profile.enableBiometricsSubtitle')}
      onSubmit={async (pin) => {
        const result = await security.enableBiometrics(pin);
        if (!result.ok) return { type: 'refused', message: t('profile.biometricCouldNotEnable') };

        switch (result.value.type) {
          case 'enabled':
          case 'pin-sign-in-off':
            return { type: 'done' };
          case 'wrong-pin':
            return { type: 'refused', message: t('auth.wrongPin') };
          case 'not-enabled':
            switch (result.value.reason) {
              case 'cancelled':
                return { type: 'stay' };
              case 'unavailable':
                return { type: 'refused', message: t('profile.biometricUnavailable') };
              case 'not-enrolled':
                return { type: 'refused', message: t('profile.biometricNotEnrolled') };
              case 'invalidated':
                return { type: 'refused', message: t('profile.biometricCouldNotEnable') };
            }
        }
      }}
    />
  );
}

function CurrentPinPad({
  subtitle,
  onSubmit,
}: {
  subtitle: string;
  onSubmit: (pin: string) => Promise<CurrentPinAnswer>;
}) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [isBusy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const answer = await onSubmit(pin);

      switch (answer.type) {
        case 'done':
          navigation.goBack();
          return;
        case 'refused':
          setPin('');
          setMessage(answer.message);
          return;
        case 'stay':
          return;
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <PinEntryLayout
      title={t('profile.enterCurrentPinTitle')}
      subtitle={subtitle}
      pin={pin}
      onChangePin={(next) => {
        setPin(next);
        if (next.length > 0) setMessage(undefined);
      }}
      {...(message === undefined ? {} : { message })}
      submitLabel={t('common.continue')}
      onSubmit={() => {
        void submit();
      }}
      isBusy={isBusy}
      onBack={() => {
        navigation.goBack();
      }}
    />
  );
}
