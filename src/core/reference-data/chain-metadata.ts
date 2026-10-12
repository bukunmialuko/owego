export type ChainMetadata = {
  name: string;
  estimatedTime: string;
  depositFeePercent: number;
  supportedTokens: readonly string[];
};

export const NATIVE_CHAIN_CODE = 'SOL';

export const CHAIN_METADATA: Record<string, ChainMetadata> = {
  SOL: {
    name: 'Solana',
    estimatedTime: '1 - 2 min',
    depositFeePercent: 1,
    supportedTokens: ['USDC', 'USDT'],
  },
  BASE: {
    name: 'Base',
    estimatedTime: '1 - 2 min',
    depositFeePercent: 3,
    supportedTokens: ['USDC'],
  },
  MONAD: {
    name: 'Monad',
    estimatedTime: '1 - 2 min',
    depositFeePercent: 1.5,
    supportedTokens: ['USDC'],
  },
  ARC: {
    name: 'Arc',
    estimatedTime: '1 - 2 min',
    depositFeePercent: 2,
    supportedTokens: ['USDC'],
  },
};
