import { CHAIN_METADATA } from '@/core/reference-data/chain-metadata';
import { chainFixture } from '@/core/reference-data/reference-data';
import { ok } from '@/core/result/result';
import {
  NATIVE_SOLANA_CHAIN,
  type Chain,
  type DepositAddress,
} from '../../domain/entity/receive-entity';
import type { ReceiveRepository } from '../../domain/repository/receive-repository';
import { toChain } from '../mapper/chain-mapper';

function previewChains(): Chain[] {
  const parsed = chainFixture.read();

  return [NATIVE_SOLANA_CHAIN, ...(parsed.ok ? parsed.value.map(toChain) : [])];
}

const ADDRESSES: Record<string, string> = {
  SOL: 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1',
  BASE: '0xb249111111111111111111111111111111110e93',
  MONAD: '0x7c1e222222222222222222222222222222227d10',
  ARC: '0x3f8a33333333333333333333333333333333a6f5',
};

export function createPreviewReceiveRepository(): ReceiveRepository {
  return {
    getChains: () => Promise.resolve(ok(previewChains())),

    getAddress: (chainCode) => {
      const address = ADDRESSES[chainCode];

      const deposit: DepositAddress | undefined =
        address === undefined
          ? undefined
          : {
              chainCode,
              address,
              acceptedTokens: [...(CHAIN_METADATA[chainCode]?.supportedTokens ?? ['USDC'])],
            };

      return Promise.resolve(ok(deposit));
    },
  };
}
