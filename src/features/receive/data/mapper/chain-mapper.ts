import { CHAIN_METADATA, NATIVE_CHAIN_CODE } from '@/core/reference-data/chain-metadata';
import type { ChainDto } from '@/core/reference-data/reference-data';
import type { Chain } from '../../domain/entity/receive-entity';

export function toChain(dto: ChainDto): Chain {
  const metadata = CHAIN_METADATA[dto.key];

  return {
    code: dto.key,
    name: metadata?.name ?? dto.key,
    networkLabel: dto.blockchain,
    estimatedTime: metadata?.estimatedTime ?? '',
    depositFeePercent: metadata?.depositFeePercent ?? 0,
    isEnabled: dto.enabled,
    isNative: dto.key === NATIVE_CHAIN_CODE,
    supportedTokens: [...(metadata?.supportedTokens ?? ['USDC'])],
  };
}
