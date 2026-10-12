import { forbidden, offline, unauthenticated } from '@/core/errors/app-error';
import { KycState } from '@/core/session/onboarding-gate';
import { createSessionCleanupRegistry } from '@/core/session/session-cleanup';
import type { AuthTokens, TokenStore } from '@/core/network/auth-tokens';
import { createFakeTokenStore } from '@/test/fake-token-store';
import type { RefreshOutcome } from '@/core/network/refresh-token-service';
import { err, ok } from '@/core/result/result';
import type { BootstrapStep } from '../entity/bootstrap-outcome';
import type { SplashProfile } from '../port/splash-port';
import { createBootstrapSessionUseCase } from './bootstrap-session-usecase';

const tokens: AuthTokens = { access: 'a', refresh: 'r' };
const profile: SplashProfile = {
  id: 'u1',
  email: 'p@example.com',
  kycState: KycState.Approved,
  firstName: 'Precious',
  country: 'ng',
};

function build(
  options: {
    stored?: AuthTokens | undefined;
    refresh?: RefreshOutcome;
    persists?: boolean;
    lockRequired?: boolean;
    loadProfile?: () => Promise<ReturnType<typeof ok<SplashProfile>>>;
    cachedProfile?: () => ReturnType<typeof ok<SplashProfile | undefined>>;
    countWallets?: () => Promise<ReturnType<typeof ok<number>>>;
    cachedWalletCount?: () => number | undefined;
    hasSkippedKyc?: boolean;
  } = {},
) {
  let current = 'stored' in options ? options.stored : tokens;
  const cleared: string[] = [];
  const registerIfNeeded = jest.fn(() => new Promise<void>(() => undefined));

  const tokenStore: TokenStore = {
    ...createFakeTokenStore(current),
    read: () => Promise.resolve(current),
    clear: () => {
      current = undefined;
      cleared.push('tokens');
      return Promise.resolve();
    },
  };

  const sessionCleanup = createSessionCleanupRegistry();
  sessionCleanup.register({
    name: 'test',
    run: () => {
      cleared.push('cleanup');
      return Promise.resolve();
    },
  });

  const steps: BootstrapStep[] = [];

  const usecase = createBootstrapSessionUseCase({
    tokenStore,
    hasSkippedKyc: () => options.hasSkippedKyc ?? false,
    refreshTokenService: {
      refresh: () => Promise.resolve(options.refresh ?? { type: 'refreshed', tokens }),
    },
    sessionCleanup,
    appLockPort: {
      sessionPersists: () => Promise.resolve(options.persists ?? true),
      isLockRequired: () => Promise.resolve(options.lockRequired ?? false),
    },
    profilePort: {
      loadProfile: options.loadProfile ?? (() => Promise.resolve(ok(profile))),
      cachedProfile: options.cachedProfile ?? (() => ok(undefined)),
    },
    walletsPort: {
      countWallets: options.countWallets ?? (() => Promise.resolve(ok(1))),
      cachedWalletCount: options.cachedWalletCount ?? (() => undefined),
    },
    pushRegistrationPort: { registerIfNeeded },
  });

  return {
    run: () => usecase.execute((step) => steps.push(step)),
    steps,
    cleared,
    registerIfNeeded,
  };
}

describe('BootstrapSessionUseCase', () => {
  describe('the strict default', () => {
    it('goes to auth when no session was persisted', async () => {
      const { run } = build({ persists: false });

      await expect(run()).resolves.toEqual({ destination: 'auth', offline: false });
    });

    it('makes no network call when nothing was persisted', async () => {
      const { run, steps } = build({ persists: false });

      await run();

      expect(steps).toEqual(['restoring-session']);
    });
  });

  describe('a sealed session', () => {
    it('routes to unlock', async () => {
      const { run } = build({ lockRequired: true, cachedProfile: () => ok(profile) });

      await expect(run()).resolves.toMatchObject({ destination: 'unlock' });
    });

    it('puts nothing on the wire before the ladder passes', async () => {
      const { run, steps } = build({ lockRequired: true, cachedProfile: () => ok(profile) });

      await run();

      expect(steps).toEqual(['restoring-session']);
    });

    it('carries the cached identity so the unlock screen can be reached', async () => {
      const { run } = build({ lockRequired: true, cachedProfile: () => ok(profile) });

      await expect(run()).resolves.toEqual({
        destination: 'unlock',
        profile,
        resumeTo: 'home',
        offline: false,
      });
    });

    it('resumes a wallet holder who still owes verification at kyc once unlocked', async () => {
      const { run } = build({
        lockRequired: true,
        cachedProfile: () => ok({ ...profile, kycState: KycState.NotStarted }),
      });

      await expect(run()).resolves.toMatchObject({ destination: 'unlock', resumeTo: 'kyc' });
    });

    it('resumes a wallet holder who declined verification at home once unlocked', async () => {
      const { run } = build({
        lockRequired: true,
        cachedProfile: () => ok({ ...profile, kycState: KycState.NotStarted }),
        hasSkippedKyc: true,
      });

      await expect(run()).resolves.toMatchObject({ destination: 'unlock', resumeTo: 'home' });
    });

    it('falls back to auth when there is no cached identity to unlock into', async () => {
      const { run, cleared } = build({
        lockRequired: true,
        cachedProfile: () => ok(undefined),
      });

      await expect(run()).resolves.toMatchObject({ destination: 'auth' });
      expect(cleared).toContain('tokens');
    });
  });

  it('goes to auth when there are no tokens at all', async () => {
    const { run } = build({ stored: undefined });

    await expect(run()).resolves.toMatchObject({ destination: 'auth' });
  });

  describe('refreshing', () => {
    it('signs out and cleans up when the refresh is rejected', async () => {
      const { run, cleared } = build({ refresh: { type: 'invalid-session' } });

      await expect(run()).resolves.toMatchObject({ destination: 'auth' });
      expect(cleared).toEqual(['tokens', 'cleanup']);
    });

    it('carries on offline when the refresh could not reach the server', async () => {
      const { run } = build({ refresh: { type: 'transient' } });

      await expect(run()).resolves.toMatchObject({ destination: 'home', offline: true });
    });
  });

  describe('the profile', () => {
    it('sends an auth failure back to sign-in', async () => {
      const { run } = build({
        loadProfile: () => Promise.resolve(err(unauthenticated()) as never),
      });

      await expect(run()).resolves.toMatchObject({ destination: 'auth' });
    });

    it('falls back to the cached snapshot when offline', async () => {
      const { run } = build({
        loadProfile: () => Promise.resolve(err(offline()) as never),
        cachedProfile: () => ok(profile),
      });

      await expect(run()).resolves.toMatchObject({ destination: 'home', offline: true });
    });

    it('goes to auth when there is nothing cached to fall back on', async () => {
      const { run } = build({ loadProfile: () => Promise.resolve(err(offline()) as never) });

      await expect(run()).resolves.toMatchObject({ destination: 'auth' });
    });
  });

  describe('the wallets', () => {
    it('treats a 403 as an auth failure, as the refresh policy does', async () => {
      const { run } = build({ countWallets: () => Promise.resolve(err(forbidden()) as never) });

      await expect(run()).resolves.toMatchObject({ destination: 'auth' });
    });

    it('admits an offline user whose cached snapshot has a wallet', async () => {
      const { run } = build({
        countWallets: () => Promise.resolve(err(offline()) as never),
        cachedWalletCount: () => 2,
      });

      await expect(run()).resolves.toMatchObject({ destination: 'home', offline: true });
    });

    it('goes to auth when offline with no cached wallet', async () => {
      const { run } = build({
        countWallets: () => Promise.resolve(err(offline()) as never),
        cachedWalletCount: () => 0,
      });

      await expect(run()).resolves.toMatchObject({ destination: 'auth' });
    });
  });

  describe('where a live session lands', () => {
    it.each(Object.values(KycState))(
      'sends a %s user with no wallet to wallet creation',
      async (kycState) => {
        const { run } = build({
          loadProfile: () => Promise.resolve(ok({ ...profile, kycState })),
          countWallets: () => Promise.resolve(ok(0)),
        });

        await expect(run()).resolves.toMatchObject({ destination: 'create-wallet' });
      },
    );

    it('offers verification to a wallet holder who still owes it', async () => {
      const { run } = build({
        loadProfile: () => Promise.resolve(ok({ ...profile, kycState: KycState.NotStarted })),
        countWallets: () => Promise.resolve(ok(1)),
      });

      await expect(run()).resolves.toMatchObject({ destination: 'kyc' });
    });

    it.each([KycState.Pending, KycState.Approved])(
      'admits a wallet holder whose kyc is %s',
      async (kycState) => {
        const { run } = build({
          loadProfile: () => Promise.resolve(ok({ ...profile, kycState })),
          countWallets: () => Promise.resolve(ok(1)),
        });

        await expect(run()).resolves.toMatchObject({ destination: 'home' });
      },
    );

    it('admits a wallet holder who declined verification', async () => {
      const { run } = build({
        loadProfile: () => Promise.resolve(ok({ ...profile, kycState: KycState.NotStarted })),
        countWallets: () => Promise.resolve(ok(1)),
        hasSkippedKyc: true,
      });

      await expect(run()).resolves.toMatchObject({ destination: 'home' });
    });
  });

  describe('push registration', () => {
    it('completes the boot even though registration never settles', async () => {
      const { run, registerIfNeeded } = build();

      await expect(run()).resolves.toMatchObject({ destination: 'home' });
      expect(registerIfNeeded).toHaveBeenCalledTimes(1);
    });

    it('is not fired when the user is going to sign-in anyway', async () => {
      const { run, registerIfNeeded } = build({ persists: false });

      await run();

      expect(registerIfNeeded).not.toHaveBeenCalled();
    });
  });

  it('reports every step in order', async () => {
    const { run, steps } = build();

    await run();

    expect(steps).toEqual([
      'restoring-session',
      'refreshing-token',
      'loading-profile',
      'loading-wallets',
      'finishing',
    ]);
  });
});

describe('the identity it hands to the session', () => {
  it('carries the profile through with the destination', async () => {
    const { run } = build();

    const outcome = await run();

    expect(outcome.profile).toMatchObject({ id: 'u1', email: 'p@example.com' });
  });
});
