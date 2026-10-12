import type { SolanaCluster } from '@/core/config/app-config';

export type DepositTokenSymbol = 'USDC' | 'USDT';

export type DepositToken = {
  symbol: DepositTokenSymbol;
  mint: string;
  decimals: number;
};

const DEPOSIT_TOKENS: Record<SolanaCluster, readonly [DepositToken, ...DepositToken[]]> = {
  devnet: [{ symbol: 'USDC', mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', decimals: 6 }],
  'mainnet-beta': [
    { symbol: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
    { symbol: 'USDT', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6 },
  ],
};

export function depositTokensFor(cluster: SolanaCluster): readonly DepositToken[] {
  return DEPOSIT_TOKENS[cluster];
}

export function primaryDepositToken(cluster: SolanaCluster): DepositToken {
  return DEPOSIT_TOKENS[cluster][0];
}

export function depositTokenFor(
  cluster: SolanaCluster,
  symbol: DepositTokenSymbol,
): DepositToken | undefined {
  return DEPOSIT_TOKENS[cluster].find((token) => token.symbol === symbol);
}
