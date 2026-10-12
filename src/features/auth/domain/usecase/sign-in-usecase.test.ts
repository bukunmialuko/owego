import { offline, unknownError } from '@/core/errors/app-error';
import { KycState } from '@/core/session/onboarding-gate';
import { err, ok } from '@/core/result/result';
import type { Session } from '../entity/auth-entity';
import type { AuthRepository } from '../repository/auth-repository';
import { createSignInUseCase } from './sign-in-usecase';

function session(kycState: string): Session {
  return {
    user: {
      id: 'u1',
      firstName: 'Precious',
      lastName: 'Jameson',
      email: 'p@example.com',
      phone: '+2340123456789',
      country: 'ng',
      isBusiness: false,
      businessName: '',
      pictureUrl: '',
      kycState,
    },
    tokens: { access: 'a', refresh: 'r' },
    verification: { kycVerified: kycState === KycState.Approved, isPinSet: false },
  };
}

function build(
  options: {
    provider?: 'google' | 'apple';
    kycState?: string;
    hasWallet?: boolean;
    authenticate?: () => Promise<ReturnType<typeof ok<{ idToken: string }>>>;
    hasSkippedKyc?: boolean;
    sessionPersists?: boolean;
  } = {},
) {
  const signInWithGoogle = jest
    .fn()
    .mockResolvedValue(ok(session(options.kycState ?? KycState.Approved)));
  const signInWithApple = jest
    .fn()
    .mockResolvedValue(ok(session(options.kycState ?? KycState.Approved)));

  const usecase = createSignInUseCase({
    provider: options.provider ?? 'google',
    hasSkippedKyc: () => options.hasSkippedKyc ?? false,
    sessionPersists: () => Promise.resolve(options.sessionPersists ?? true),
    authRepository: {
      signInWithGoogle,
      signInWithApple,
      signUpWithGoogle: jest.fn(),
      signUpWithApple: jest.fn(),
    } satisfies AuthRepository,
    walletProvisioning: {
      hasProvisionedWallet: () => Promise.resolve(ok(options.hasWallet ?? false)),
    },
    authenticator: {
      authenticate: options.authenticate ?? (() => Promise.resolve(ok({ idToken: 'id' }))),
    },
  });

  return { usecase, signInWithGoogle, signInWithApple };
}

describe('SignInUseCase', () => {
  describe('provider routing', () => {
    it('exchanges a google credential at the google endpoint', async () => {
      const { usecase, signInWithGoogle, signInWithApple } = build({ provider: 'google' });

      await usecase.execute();

      expect(signInWithGoogle).toHaveBeenCalledWith({ idToken: 'id' });
      expect(signInWithApple).not.toHaveBeenCalled();
    });

    it('exchanges an apple credential at the apple endpoint', async () => {
      const { usecase, signInWithApple } = build({ provider: 'apple' });

      await usecase.execute();

      expect(signInWithApple).toHaveBeenCalledWith({ idToken: 'id' });
    });
  });

  describe('where the user lands', () => {
    it.each(Object.values(KycState))(
      'sends a %s user with no wallet to wallet creation',
      async (kycState) => {
        const { usecase } = build({ hasWallet: false, kycState });

        const result = await usecase.execute();

        expect(result.ok && result.value.stage).toBe('create-wallet');
      },
    );

    it.each([KycState.NotStarted, KycState.Rejected])(
      'offers verification to a wallet holder whose kyc is %s',
      async (kycState) => {
        const { usecase } = build({ hasWallet: true, kycState });

        const result = await usecase.execute();

        expect(result.ok && result.value.stage).toBe('kyc');
      },
    );

    it.each([KycState.Pending, KycState.Approved])(
      'admits a wallet holder whose kyc is %s',
      async (kycState) => {
        const { usecase } = build({ hasWallet: true, kycState });

        const result = await usecase.execute();

        expect(result.ok && result.value.stage).toBe('ready');
      },
    );

    it('admits a wallet holder who declined verification on this device', async () => {
      const { usecase } = build({
        hasWallet: true,
        kycState: KycState.NotStarted,
        hasSkippedKyc: true,
      });

      const result = await usecase.execute();

      expect(result.ok && result.value.stage).toBe('ready');
    });

    it.each([KycState.NotStarted, KycState.Approved])(
      'asks a returning %s wallet holder for a sign-in PIN first',
      async (kycState) => {
        const { usecase } = build({ hasWallet: true, kycState, sessionPersists: false });

        const result = await usecase.execute();

        expect(result.ok && result.value.stage).toBe('secure-session');
      },
    );

    it('never asks a user with no wallet for a sign-in PIN', async () => {
      const { usecase } = build({ hasWallet: false, sessionPersists: false });

      const result = await usecase.execute();

      expect(result.ok && result.value.stage).toBe('create-wallet');
    });

    it('returns the session alongside the stage', async () => {
      const { usecase } = build({ hasWallet: true });

      const result = await usecase.execute();

      expect(result.ok && result.value.session.user.id).toBe('u1');
    });
  });

  describe('failures stay failures', () => {
    it('stops when the sdk fails, without calling the api', async () => {
      const { usecase, signInWithGoogle } = build({
        authenticate: () => Promise.resolve(err(unknownError('cancelled')) as never),
      });

      const result = await usecase.execute();

      expect(result.ok).toBe(false);
      expect(signInWithGoogle).not.toHaveBeenCalled();
    });

    it('stops when the wallet check fails rather than guessing', async () => {
      const usecase = createSignInUseCase({
        provider: 'google',
        hasSkippedKyc: () => false,
        sessionPersists: () => Promise.resolve(true),
        authRepository: {
          signInWithGoogle: () => Promise.resolve(ok(session(KycState.Approved))),
        } as unknown as AuthRepository,
        walletProvisioning: { hasProvisionedWallet: () => Promise.resolve(err(offline())) },
        authenticator: { authenticate: () => Promise.resolve(ok({ idToken: 'id' })) },
      });

      await expect(usecase.execute()).resolves.toEqual(err(offline()));
    });
  });
});
