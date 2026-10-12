import { CHAIN_METADATA, NATIVE_CHAIN_CODE } from '@/core/reference-data/chain-metadata';
import type { AssetNetwork } from '../entity/asset-transfer';

const SOLANA: AssetNetwork = {
  code: NATIVE_CHAIN_CODE,
  name: CHAIN_METADATA[NATIVE_CHAIN_CODE]?.name ?? 'Solana',
  networkLabel: NATIVE_CHAIN_CODE,
  isEnabled: true,
};

export const SEND_NETWORKS: readonly AssetNetwork[] = [SOLANA];

export function sendNetworkFor(code: string | undefined): AssetNetwork | undefined {
  return SEND_NETWORKS.find((network) => network.code === code);
}

export function defaultSendNetwork(code?: string): AssetNetwork {
  return sendNetworkFor(code) ?? SOLANA;
}

export const SENDABLE_TOKENS = ['USDC', 'USDT'] as const;

export type SendableToken = (typeof SENDABLE_TOKENS)[number];

export function isSendableToken(symbol: string): symbol is SendableToken {
  return SENDABLE_TOKENS.some((token) => token === symbol);
}
