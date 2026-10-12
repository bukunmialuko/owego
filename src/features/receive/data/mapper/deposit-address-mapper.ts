import { CHAIN_METADATA } from '@/core/reference-data/chain-metadata';
import type { DepositAddress } from '../../domain/entity/receive-entity';
import type { DepositAddressDto } from '../model/receive-model';

export function toDepositAddress(
  dto: DepositAddressDto,
  chainCode: string,
): DepositAddress | undefined {
  if (dto.status !== 'ACTIVE' || dto.address === '') return undefined;

  return {
    chainCode,
    address: dto.address,
    acceptedTokens: [...(CHAIN_METADATA[chainCode]?.supportedTokens ?? ['USDC'])],
  };
}
