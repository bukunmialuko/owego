import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useResolve } from '@/core/di/container-provider';
import { useSession } from '@/core/session/use-session';
import { MAX_UNLOCK_ATTEMPTS } from '../../domain/usecase/unlock-usecase';

export const PROMPT_DELAY_MS = 400;

const REASON_KEY = {
  off: undefined,
  cancelled: undefined,
  unavailable: 'auth.biometricsUnavailable',
  'not-enrolled': 'auth.biometricsNotEnrolled',
  invalidated: 'auth.biometricsInvalidated',
} as const;

export function useUnlock() {
  const { t } = useTranslation();
  const unlock = useResolve('unlockUseCase');
  const signOut = useResolve('signOutUseCase');
  const { unlocked } = useSession();

  const [message, setMessage] = useState<string | undefined>(undefined);
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_UNLOCK_ATTEMPTS);
  const [isBusy, setBusy] = useState(false);
  const [offersBiometrics, setOffersBiometrics] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void unlock.attemptsLeft().then((remaining) => {
      if (!cancelled) setAttemptsLeft(remaining);
    });

    return () => {
      cancelled = true;
    };
  }, [unlock]);

  const abandon = useCallback(async () => {
    await unlock.abandon();
    await signOut.execute();
  }, [signOut, unlock]);

  const promptBiometric = useCallback(async () => {
    setBusy(true);
    try {
      const result = await unlock.tryBiometric();
      if (!result.ok) return;

      switch (result.value.type) {
        case 'unlocked':
          unlocked();
          return;
        case 'needs-pin': {
          const key = REASON_KEY[result.value.reason];
          setMessage(key === undefined ? undefined : t(key));
          return;
        }
        case 'signed-out':
          await abandon();
          return;
        case 'wrong-pin':
          return;
      }
    } finally {
      setBusy(false);
    }
  }, [abandon, t, unlock, unlocked]);

  const submitPin = useCallback(
    async (pin: string) => {
      setBusy(true);
      try {
        const result = await unlock.tryPin(pin);
        if (!result.ok) {
          setMessage(t('errors.common.unknown'));
          return;
        }

        switch (result.value.type) {
          case 'unlocked':
            unlocked();
            return;
          case 'wrong-pin':
            setAttemptsLeft(result.value.attemptsLeft);
            setMessage(t('auth.wrongPin'));
            return;
          case 'signed-out':
            await abandon();
            return;
          case 'needs-pin':
            return;
        }
      } finally {
        setBusy(false);
      }
    },
    [abandon, t, unlock, unlocked],
  );

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    void unlock.offersBiometrics().then((offered) => {
      if (cancelled) return;
      setOffersBiometrics(offered);
      if (!offered) return;

      timer = setTimeout(() => {
        void promptBiometric();
      }, PROMPT_DELAY_MS);
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [promptBiometric, unlock]);

  return { message, attemptsLeft, isBusy, offersBiometrics, promptBiometric, submitPin, abandon };
}
