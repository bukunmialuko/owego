import type { AppError } from '@/core/errors/app-error';
import { resolveOnboardingStage } from '@/core/session/onboarding-gate';
import type { OnboardingStage } from '@/core/session/session-store';
import { ok, type Result } from '@/core/result/result';
import type { Session } from '../entity/auth-entity';
import type { AuthRepository } from '../repository/auth-repository';
import type { OAuthAuthenticator, WalletProvisioningPort } from '../port/auth-port';

type SignInOutcome = { session: Session; stage: OnboardingStage };

export interface SignInUseCase {
  execute(): Promise<Result<SignInOutcome, AppError>>;
}

type Dependencies = {
  authRepository: AuthRepository;
  walletProvisioning: WalletProvisioningPort;
  authenticator: OAuthAuthenticator;
  provider: 'google' | 'apple';
  hasSkippedKyc: () => boolean;
  sessionPersists: () => Promise<boolean>;
};

export function createSignInUseCase({
  authRepository,
  walletProvisioning,
  authenticator,
  provider,
  hasSkippedKyc,
  sessionPersists,
}: Dependencies): SignInUseCase {
  return {
    async execute() {
      const credential = await authenticator.authenticate();
      if (!credential.ok) return credential;

      const session =
        provider === 'google'
          ? await authRepository.signInWithGoogle(credential.value)
          : await authRepository.signInWithApple(credential.value);
      if (!session.ok) return session;

      const provisioned = await walletProvisioning.hasProvisionedWallet();
      if (!provisioned.ok) return provisioned;

      return ok({
        session: session.value,
        stage: resolveOnboardingStage({
          walletCount: provisioned.value ? 1 : 0,
          kycState: session.value.user.kycState,
          hasSkippedKyc: hasSkippedKyc(),
          keepsSession: await sessionPersists(),
          hasDeclinedSignInPin: false,
        }),
      });
    },
  };
}
