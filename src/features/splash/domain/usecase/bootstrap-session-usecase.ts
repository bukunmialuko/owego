import type { RefreshTokenService } from '@/core/network/refresh-token-service';
import type { TokenStore } from '@/core/network/auth-tokens';
import type { SessionCleanupRegistry } from '@/core/session/session-cleanup';
import { resolveOnboardingStage, resolveWalletHolderStage } from '@/core/session/onboarding-gate';
import type { BootstrapOutcome, BootstrapStep } from '../entity/bootstrap-outcome';
import type {
  AppLockPort,
  ProfilePort,
  PushRegistrationPort,
  SplashProfile,
  WalletsPort,
} from '../port/splash-port';

type Dependencies = {
  tokenStore: TokenStore;
  refreshTokenService: RefreshTokenService;
  sessionCleanup: SessionCleanupRegistry;
  appLockPort: AppLockPort;
  profilePort: ProfilePort;
  walletsPort: WalletsPort;
  pushRegistrationPort: PushRegistrationPort;
  hasSkippedKyc: () => boolean;
};

export interface BootstrapSessionUseCase {
  execute(onStep: (step: BootstrapStep) => void): Promise<BootstrapOutcome>;
}

export function createBootstrapSessionUseCase({
  tokenStore,
  refreshTokenService,
  sessionCleanup,
  appLockPort,
  profilePort,
  walletsPort,
  pushRegistrationPort,
  hasSkippedKyc,
}: Dependencies): BootstrapSessionUseCase {
  async function toAuth(): Promise<BootstrapOutcome> {
    await tokenStore.clear();
    await sessionCleanup.runAll();

    return { destination: 'auth', offline: false };
  }

  return {
    async execute(onStep) {
      onStep('restoring-session');

      if (!(await appLockPort.sessionPersists())) return { destination: 'auth', offline: false };

      if (await appLockPort.isLockRequired()) {
        const cached = profilePort.cachedProfile();
        if (!cached.ok || cached.value === undefined) return toAuth();

        const resumeStage = resolveWalletHolderStage({
          kycState: cached.value.kycState,
          hasSkippedKyc: hasSkippedKyc(),
          keepsSession: true,
          hasDeclinedSignInPin: false,
        });

        return {
          destination: 'unlock',
          profile: cached.value,
          resumeTo: resumeStage === 'ready' ? 'home' : resumeStage,
          offline: false,
        };
      }

      if ((await tokenStore.read()) === undefined) return { destination: 'auth', offline: false };

      onStep('refreshing-token');
      const refresh = await refreshTokenService.refresh();
      if (refresh.type === 'invalid-session') return toAuth();

      let offline = refresh.type === 'transient';

      onStep('loading-profile');
      const profileResult = await profilePort.loadProfile();
      let profile: SplashProfile | undefined;

      if (profileResult.ok) {
        profile = profileResult.value;
      } else {
        if (profileResult.error.category === 'auth') return toAuth();

        const cached = profilePort.cachedProfile();
        if (!cached.ok || cached.value === undefined) return toAuth();

        profile = cached.value;
        offline = true;
      }

      onStep('loading-wallets');
      const walletsResult = await walletsPort.countWallets();
      let walletCount: number;

      if (walletsResult.ok) {
        walletCount = walletsResult.value;
      } else {
        if (walletsResult.error.category === 'auth') return toAuth();

        const cachedCount = walletsPort.cachedWalletCount();
        if (cachedCount === undefined || cachedCount === 0) return toAuth();

        walletCount = cachedCount;
        offline = true;
      }

      onStep('finishing');
      const stage = resolveOnboardingStage({
        walletCount,
        kycState: profile.kycState,
        hasSkippedKyc: hasSkippedKyc(),
        keepsSession: true,
        hasDeclinedSignInPin: false,
      });

      void pushRegistrationPort.registerIfNeeded();

      return {
        destination: stage === 'ready' ? 'home' : stage,
        profile,
        offline,
      };
    },
  };
}
