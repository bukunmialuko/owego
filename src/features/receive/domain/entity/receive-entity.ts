import { CHAIN_METADATA, NATIVE_CHAIN_CODE } from '@/core/reference-data/chain-metadata';

export type Chain = {
  code: string;
  name: string;
  networkLabel: string;
  estimatedTime: string;
  depositFeePercent: number;
  isEnabled: boolean;
  isNative: boolean;
  supportedTokens: string[];
};

export type DepositAddress = {
  chainCode: string;
  address: string;
  acceptedTokens: string[];
};

export const NATIVE_SOLANA_CHAIN: Chain = {
  code: NATIVE_CHAIN_CODE,
  name: CHAIN_METADATA[NATIVE_CHAIN_CODE]?.name ?? 'Solana',
  networkLabel: NATIVE_CHAIN_CODE,
  estimatedTime: CHAIN_METADATA[NATIVE_CHAIN_CODE]?.estimatedTime ?? '',
  depositFeePercent: CHAIN_METADATA[NATIVE_CHAIN_CODE]?.depositFeePercent ?? 0,
  isEnabled: true,
  isNative: true,
  supportedTokens: [...(CHAIN_METADATA[NATIVE_CHAIN_CODE]?.supportedTokens ?? ['USDC'])],
};
