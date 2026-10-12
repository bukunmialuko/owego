import {
  KycState,
  requiresVerification,
  resolveOnboardingStage,
  resolveWalletHolderStage,
  toKycState,
} from './onboarding-gate';

const KEPT = { keepsSession: true, hasDeclinedSignInPin: false } as const;
const NOT_KEPT = { keepsSession: false, hasDeclinedSignInPin: false } as const;

describe('toKycState', () => {
  it.each(Object.values(KycState))('reads %s straight through', (state) => {
    expect(toKycState(state)).toBe(state);
  });

  it('normalizes casing and whitespace', () => {
    expect(toKycState(' approved ')).toBe(KycState.Approved);
  });

  it('treats an unknown state as approved rather than blocking', () => {
    expect(toKycState('WHATEVER')).toBe(KycState.Approved);
  });

  it('treats a blank state as approved', () => {
    expect(toKycState('')).toBe(KycState.Approved);
  });
});

describe('requiresVerification', () => {
  it.each([KycState.NotStarted, KycState.Rejected])('routes %s to verification', (state) => {
    expect(requiresVerification(state)).toBe(true);
  });

  it('asks nothing more of a user whose documents are already in', () => {
    expect(requiresVerification(KycState.Pending)).toBe(false);
  });

  it('lets an approved user through', () => {
    expect(requiresVerification(KycState.Approved)).toBe(false);
  });
});

describe('resolveOnboardingStage', () => {
  describe('with no wallet', () => {
    it.each(
      Object.values(KycState).flatMap((kycState) => [
        { kycState, hasSkippedKyc: false },
        { kycState, hasSkippedKyc: true },
      ]),
    )('sends a $kycState user (skipped: $hasSkippedKyc) to wallet creation', (input) => {
      expect(resolveOnboardingStage({ walletCount: 0, ...input, ...NOT_KEPT })).toBe(
        'create-wallet',
      );
    });

    it('sends a user with an unreadable state to wallet creation', () => {
      expect(
        resolveOnboardingStage({
          walletCount: 0,
          kycState: 'nonsense',
          hasSkippedKyc: false,
          ...KEPT,
        }),
      ).toBe('create-wallet');
    });
  });

  describe('with a wallet', () => {
    it('offers verification to a wallet holder who still owes it', () => {
      expect(
        resolveOnboardingStage({
          walletCount: 1,
          kycState: 'NOT_STARTED',
          hasSkippedKyc: false,
          ...KEPT,
        }),
      ).toBe('kyc');
    });

    it('admits a wallet holder with a usable wallet among several', () => {
      expect(
        resolveOnboardingStage({
          walletCount: 2,
          kycState: 'APPROVED',
          hasSkippedKyc: false,
          ...KEPT,
        }),
      ).toBe('ready');
    });
  });
});

describe('the sign-in PIN', () => {
  it('is asked of a wallet holder whose session does not persist, before verification', () => {
    expect(
      resolveOnboardingStage({
        walletCount: 1,
        kycState: KycState.NotStarted,
        hasSkippedKyc: false,
        ...NOT_KEPT,
      }),
    ).toBe('secure-session');
  });

  it('is asked of a verified wallet holder before home', () => {
    expect(
      resolveWalletHolderStage({ kycState: KycState.Approved, hasSkippedKyc: false, ...NOT_KEPT }),
    ).toBe('secure-session');
  });

  it('is not asked when the session already persists', () => {
    expect(
      resolveWalletHolderStage({ kycState: KycState.Approved, hasSkippedKyc: false, ...KEPT }),
    ).toBe('ready');
  });

  it('falls through to verification once declined this session', () => {
    expect(
      resolveWalletHolderStage({
        kycState: KycState.NotStarted,
        hasSkippedKyc: false,
        keepsSession: false,
        hasDeclinedSignInPin: true,
      }),
    ).toBe('kyc');
  });

  it('is never asked of a user with no wallet', () => {
    expect(
      resolveOnboardingStage({
        walletCount: 0,
        kycState: KycState.Approved,
        hasSkippedKyc: false,
        ...NOT_KEPT,
      }),
    ).toBe('create-wallet');
  });
});

describe('resolveWalletHolderStage', () => {
  it('offers verification to a wallet holder who has not started it', () => {
    expect(
      resolveWalletHolderStage({ kycState: KycState.NotStarted, hasSkippedKyc: false, ...KEPT }),
    ).toBe('kyc');
  });

  it('offers verification again to a wallet holder who was rejected', () => {
    expect(
      resolveWalletHolderStage({ kycState: KycState.Rejected, hasSkippedKyc: false, ...KEPT }),
    ).toBe('kyc');
  });

  it('admits a wallet holder whose documents are under review', () => {
    expect(
      resolveWalletHolderStage({ kycState: KycState.Pending, hasSkippedKyc: false, ...KEPT }),
    ).toBe('ready');
  });

  it('admits an approved wallet holder', () => {
    expect(
      resolveWalletHolderStage({ kycState: KycState.Approved, hasSkippedKyc: false, ...KEPT }),
    ).toBe('ready');
  });

  it('admits a wallet holder who declined verification on this device', () => {
    expect(
      resolveWalletHolderStage({ kycState: KycState.NotStarted, hasSkippedKyc: true, ...KEPT }),
    ).toBe('ready');
  });

  it('admits a wallet holder whose state is unreadable', () => {
    expect(resolveWalletHolderStage({ kycState: '', hasSkippedKyc: false, ...KEPT })).toBe('ready');
  });
});
