import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { AppError } from '@/core/errors/app-error';
import type { TranslationKey } from '@/core/i18n/translation-key';
import { useResolve } from '@/core/di/container-provider';
import { devLog } from '@/core/log/dev-log';
import { useAdmitWalletHolder } from '@/core/session/use-admit-wallet-holder';
import { useSession } from '@/core/session/use-session';
import { isUsableWallet } from '@/core/wallet/wallet';
import { useContactSupport } from '@/shared/ui';
import type { CreateWalletOutcome } from '../../domain/usecase/create-wallet-usecase';

type Phase = 'checking' | 'idle' | 'starting';

export const WALLET_CHECK_TIMEOUT_MS = 8_000;

export function useWalletSetup() {
  const { t } = useTranslation();
  const walletRepository = useResolve('walletRepository');
  const createWallet = useResolve('createWalletUseCase');
  const { stageAdvanced } = useSession();
  const admit = useAdmitWalletHolder();
  const contactSupport = useContactSupport();
  const [phase, setPhase] = useState<Phase>('checking');

  const isStarting = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const offerStart = (reason: string) => () => {
      devLog('wallet', `check ${reason}, offering start`);
      if (!cancelled) setPhase('idle');
    };

    const giveUp = setTimeout(offerStart('timed out'), WALLET_CHECK_TIMEOUT_MS);

    walletRepository
      .getWallets()
      .then((result) => {
        if (cancelled) return;
        clearTimeout(giveUp);

        if (result.ok && result.value.some(isUsableWallet)) {
          void admit();
          return;
        }

        offerStart(result.ok ? 'found no wallet' : `failed: ${describeFailure(result.error)}`)();
      })
      .catch(offerStart('threw'));

    return () => {
      cancelled = true;
      clearTimeout(giveUp);
    };
  }, [admit, walletRepository]);

  const start = useCallback(async () => {
    if (isStarting.current) return;
    isStarting.current = true;
    setPhase('starting');

    try {
      const result = await createWallet.execute();

      if (!result.ok) {
        Alert.alert(t(result.error.titleKey));
        return;
      }

      const message = messageFor(result.value, t);
      if (message !== undefined) Alert.alert(message);

      if (
        result.value.type === 'provisioning' ||
        result.value.type === 'provisioning-unconfirmed'
      ) {
        stageAdvanced('provisioning');
        return;
      }

      if (result.value.type === 'refused') {
        Alert.alert(t('wallet.setupRefusedTitle'), t('wallet.setupRefusedBody'), [
          { text: t('common.close'), style: 'cancel' },
          { text: t('common.contactSupport'), onPress: () => void contactSupport() },
        ]);
      }
    } finally {
      isStarting.current = false;
      setPhase('idle');
    }
  }, [contactSupport, createWallet, stageAdvanced, t]);

  return { phase, start, isBusy: phase === 'starting' };
}

function describeFailure(error: AppError): string {
  const fields = Object.keys(error.fieldErrors ?? {}).join(',');

  return fields === '' ? error.code : `${error.code} fields=${fields}`;
}

function messageFor(
  outcome: CreateWalletOutcome,
  t: (key: TranslationKey) => string,
): string | undefined {
  switch (outcome.type) {
    case 'provisioning':
      return undefined;

    case 'provisioning-unconfirmed':
      return t('auth.circleExecuteUnknown');

    case 'refused':
      return undefined;

    case 'cancelled':
      return undefined;

    case 'setup-incomplete':
      return t('auth.circleWalletSetupIncomplete');

    case 'challenge-unavailable':
      return t('auth.walletChallengeFetchFailed');

    case 'failed':
      return failureMessage(outcome, t);
  }
}

function failureMessage(
  outcome: Extract<CreateWalletOutcome, { type: 'failed' }>,
  t: (key: TranslationKey) => string,
): string | undefined {
  switch (outcome.reason) {
    case 'insecure-pin':
      return t('auth.circlePinCannotRepeatOrBeConsecutive');

    case 'pin-locked':
      return t('auth.circlePinLocked');

    case 'incorrect-pin':
      return t('auth.circleIncorrectPin');

    case 'network':
      return t('errors.network.offline');

    case 'biometrics-unavailable':
      return undefined;

    case 'challenge-invalid':
      return t('auth.circleSdkException');

    case 'unknown':
      return outcome.message === '' ? t('auth.circleSdkException') : outcome.message;
  }
}
