export type AccountStage = 'kyc' | 'create-wallet' | 'secure-session' | 'ready';

export type WalletHolderStage = Exclude<AccountStage, 'create-wallet'>;

export const KycState = {
  NotStarted: 'NOT_STARTED',
  Pending: 'PENDING',
  Approved: 'APPROVED',
  Rejected: 'REJECTED',
} as const;

export type KycState = (typeof KycState)[keyof typeof KycState];

export function toKycState(raw: string): KycState {
  const normalized = raw.trim().toLowerCase();
  const known = Object.values(KycState).find((state) => state.toLowerCase() === normalized);

  return known ?? KycState.Approved;
}

export function requiresVerification(state: KycState): boolean {
  switch (state) {
    case KycState.NotStarted:
    case KycState.Rejected:
      return true;
    case KycState.Pending:
    case KycState.Approved:
      return false;
  }
}

export function resolveOnboardingStage(
  input: WalletHolderInput & { walletCount: number },
): AccountStage {
  return input.walletCount > 0 ? resolveWalletHolderStage(input) : 'create-wallet';
}

type WalletHolderInput = {
  kycState: string;
  hasSkippedKyc: boolean;
  keepsSession: boolean;
  hasDeclinedSignInPin: boolean;
};

export function resolveWalletHolderStage(input: WalletHolderInput): WalletHolderStage {
  if (!input.keepsSession && !input.hasDeclinedSignInPin) return 'secure-session';

  const outstanding = requiresVerification(toKycState(input.kycState));

  return outstanding && !input.hasSkippedKyc ? 'kyc' : 'ready';
}
