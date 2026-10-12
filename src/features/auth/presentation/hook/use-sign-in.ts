import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useResolve } from '@/core/di/container-provider';
import { ErrorCode } from '@/core/errors/app-error';
import { toKycState } from '@/core/session/onboarding-gate';
import { useSession } from '@/core/session/use-session';

export type SignInProvider = 'google' | 'apple';

export function useSignIn() {
  const { t } = useTranslation();
  const googleUseCase = useResolve('signInWithGoogleUseCase');
  const appleUseCase = useResolve('signInWithAppleUseCase');
  const telemetry = useResolve('telemetry');
  const { signedIn } = useSession();
  const [pending, setPending] = useState<SignInProvider | undefined>(undefined);

  const signIn = useCallback(
    async (provider: SignInProvider) => {
      if (pending !== undefined) return;
      setPending(provider);

      try {
        const result = await (provider === 'google' ? googleUseCase : appleUseCase).execute();

        if (!result.ok) {
          if (result.error.code === ErrorCode.SignInCancelled) return;

          telemetry.captureError(result.error);

          Alert.alert(
            t('auth.signInFailed'),
            __DEV__ ? `${result.error.code}\n\n${result.error.detail ?? ''}` : undefined,
          );
          return;
        }

        const { session, stage } = result.value;
        signedIn(
          {
            id: session.user.id,
            firstName: session.user.firstName,
            kycState: toKycState(session.user.kycState),
          },
          stage,
        );
      } finally {
        setPending(undefined);
      }
    },
    [appleUseCase, googleUseCase, pending, signedIn, t, telemetry],
  );

  return { signIn, pending, isBusy: pending !== undefined };
}
