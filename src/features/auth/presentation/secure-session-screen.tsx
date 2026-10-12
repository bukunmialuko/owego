import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, PanResponder } from 'react-native';
import { useResolve } from '@/core/di/container-provider';
import type { TranslationKey } from '@/core/i18n/translation-key';
import { createBackSwipeConfig } from '@/core/session/back-swipe';
import { useAdmitWalletHolder } from '@/core/session/use-admit-wallet-holder';
import { useSession } from '@/core/session/use-session';
import { BiometricOffer, PinEntryLayout, usePinSetup, type PinSetupResult } from '@/shared/ui';
import type { BiometricKind } from '../domain/port/auth-port';
import type { PinProblem } from '../domain/usecase/pin-strength';

const PROBLEM_KEY = {
  'wrong-length': 'auth.pinTooShort',
  'not-numeric': 'auth.pinNotNumeric',
  repeated: 'auth.pinRepeated',
  consecutive: 'auth.pinConsecutive',
} as const satisfies Record<PinProblem, TranslationKey>;

export function SecureSessionScreen() {
  const { t } = useTranslation();
  const pinSignIn = useResolve('pinSignInToggleUseCase');
  const biometricSignIn = useResolve('biometricSignInToggleUseCase');
  const readSecurity = useResolve('readSignInSecurityUseCase');
  const admit = useAdmitWalletHolder();
  const { signInPinDeclined } = useSession();
  const [offer, setOffer] = useState<{ pin: string; kind: BiometricKind } | undefined>(undefined);
  const [isAddingBiometrics, setAddingBiometrics] = useState(false);

  const declinePin = useCallback(() => {
    signInPinDeclined();
    void admit();
  }, [admit, signInPinDeclined]);

  const moveOn = useCallback(() => {
    void admit();
  }, [admit]);

  const addBiometrics = useCallback(async () => {
    if (offer === undefined) return;

    setAddingBiometrics(true);
    await biometricSignIn.enable(offer.pin);
    setAddingBiometrics(false);
    moveOn();
  }, [biometricSignIn, moveOn, offer]);

  const setup = usePinSetup({
    mismatchMessage: t('pin.mismatch'),
    onSubmit: async (pin): Promise<PinSetupResult> => {
      const result = await pinSignIn.enable(pin);
      if (!result.ok) return { type: 'retry', message: t('errors.common.unknown') };

      switch (result.value.type) {
        case 'enabled': {
          const { device } = await readSecurity.execute();
          if (device.type === 'available') setOffer({ pin, kind: device.kind });
          else void admit();
          return { type: 'done' };
        }
        case 'rejected':
          return { type: 'restart', message: t(PROBLEM_KEY[result.value.problem]) };
      }
    },
  });

  const { back: stepBack } = setup;
  const isOffering = offer !== undefined;
  const goBack = useCallback(() => {
    if (isOffering) {
      if (!isAddingBiometrics) moveOn();
      return;
    }
    if (!stepBack()) declinePin();
  }, [declinePin, isAddingBiometrics, isOffering, moveOn, stepBack]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();

      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [goBack]);

  const panResponder = useMemo(() => PanResponder.create(createBackSwipeConfig(goBack)), [goBack]);

  if (offer !== undefined) {
    return (
      <BiometricOffer
        kind={offer.kind}
        isBusy={isAddingBiometrics}
        onEnable={() => {
          void addBiometrics();
        }}
        onDecline={moveOn}
        panHandlers={panResponder.panHandlers}
      />
    );
  }

  const isCreating = setup.step === 'create';

  return (
    <PinEntryLayout
      title={isCreating ? t('auth.signInPinTitle') : t('pin.confirmTitle')}
      subtitle={isCreating ? t('auth.signInPinBody') : t('pin.confirmSubtitle')}
      pin={setup.pin}
      onChangePin={setup.setPin}
      {...(setup.message === undefined ? {} : { message: setup.message })}
      submitLabel={t('common.continue')}
      onSubmit={() => {
        void setup.submit();
      }}
      isBusy={setup.isBusy}
      {...(isCreating ? {} : { onBack: goBack })}
      action={{ label: t('auth.notNow'), onPress: declinePin }}
      panHandlers={panResponder.panHandlers}
    />
  );
}
