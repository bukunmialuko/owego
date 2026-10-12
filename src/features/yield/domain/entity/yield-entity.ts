export type MovementKind = 'deposit' | 'withdrawal';

type YieldProvider = 'jupiter';

export const MOVABLE_TOKEN = 'USDC';

export type YieldProduct = {
  id: string;
  tokenSymbol: string;
  tokenMint: string;
  apyPercent?: number;
  provider: YieldProvider;
  isStakeable: boolean;
  walletBalanceMinor?: number;
};

export type YieldTarget = {
  vaultId: string;
  tokenSymbol: string;
  tokenMint: string;
  apyPercent?: number;
  provider: YieldProvider;
};

export type MoveTarget = {
  target: YieldTarget;
  ceilingMinor?: number;
};
