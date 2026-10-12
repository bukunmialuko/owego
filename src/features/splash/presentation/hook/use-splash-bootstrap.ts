import { useCallback, useEffect, useRef, useState } from 'react';
import { useResolve } from '@/core/di/container-provider';
import { useSession } from '@/core/session/use-session';
import { toKycState } from '@/core/session/onboarding-gate';
import type { OnboardingStage } from '@/core/session/session-store';
import {
  STEP_PROGRESS,
  type BootstrapDestination,
  type BootstrapStep,
} from '../../domain/entity/bootstrap-outcome';

export const MINIMUM_VISIBLE_MS = 600;

export const BOOT_TIMEOUT_MS = 15_000;

export const REVEAL_DELAY_MS = 400;

type Phase = 'working' | 'timed-out';

export function useSplashBootstrap() {
  const bootstrap = useResolve('bootstrapSessionUseCase');
  const { bootstrapped } = useSession();

  const [progress, setProgress] = useState(0);
  const [isRevealed, setRevealed] = useState(false);
  const [phase, setPhase] = useState<Phase>('working');
  const [attempt, setAttempt] = useState(0);
  const isSettled = useRef(false);

  useEffect(() => {
    const reveal = setTimeout(() => {
      setRevealed(true);
    }, REVEAL_DELAY_MS);

    return () => {
      clearTimeout(reveal);
    };
  }, []);

  useEffect(() => {
    isSettled.current = false;

    const startedAt = Date.now();
    let cancelled = false;

    const timeout = setTimeout(() => {
      if (cancelled || isSettled.current) return;
      setPhase('timed-out');
    }, BOOT_TIMEOUT_MS);

    function onStep(step: BootstrapStep) {
      if (!cancelled) setProgress(STEP_PROGRESS[step]);
    }

    void bootstrap.execute(onStep).then(async (outcome) => {
      isSettled.current = true;
      if (cancelled) return;

      const remaining = MINIMUM_VISIBLE_MS - (Date.now() - startedAt);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
      if (cancelled) return;

      const stage = toStage(outcome.destination);
      const resumeStage = outcome.resumeTo === undefined ? undefined : toStage(outcome.resumeTo);
      const profile = outcome.profile;

      bootstrapped(
        stage === undefined || profile === undefined || profile.id === ''
          ? { session: undefined, offline: outcome.offline }
          : {
              session: {
                user: {
                  id: profile.id,
                  firstName: profile.firstName,
                  kycState: toKycState(profile.kycState),
                },
                stage,
                ...(resumeStage === undefined ? {} : { resumeStage }),
              },
              offline: outcome.offline,
            },
      );
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [attempt, bootstrap, bootstrapped]);

  const retry = useCallback(() => {
    setPhase('working');
    setProgress(0);
    setAttempt((value) => value + 1);
  }, []);

  return { progress, isRevealed, hasTimedOut: phase === 'timed-out', retry };
}

function toStage(destination: BootstrapDestination): OnboardingStage | undefined {
  switch (destination) {
    case 'auth':
      return undefined;
    case 'home':
      return 'ready';
    case 'unlock':
      return 'locked';
    case 'kyc':
    case 'create-wallet':
    case 'secure-session':
      return destination;
  }
}
