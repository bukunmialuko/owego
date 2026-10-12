import { CHAIN_METADATA, NATIVE_CHAIN_CODE } from '@/core/reference-data/chain-metadata';
import { map, ok, type Result } from '@/core/result/result';
import type { AppError } from '@/core/errors/app-error';
import {
  NATIVE_SOLANA_CHAIN,
  type Chain,
  type DepositAddress,
} from '../../domain/entity/receive-entity';
import type { SolanaWalletAddressPort } from '../../domain/port/solana-wallet-address-port';
import type { ReceiveRepository } from '../../domain/repository/receive-repository';
import type { ReceiveRemoteDataSource } from '../datasource/receive-remote-datasource';
import { toDepositAddress } from '../mapper/deposit-address-mapper';
import { toChain } from '../mapper/chain-mapper';

type Dependencies = {
  remoteDataSource: ReceiveRemoteDataSource;
  solanaWalletAddressPort: SolanaWalletAddressPort;
};

export function createReceiveRepositoryImpl({
  remoteDataSource,
  solanaWalletAddressPort,
}: Dependencies): ReceiveRepository {
  return {
    async getChains(): Promise<Result<Chain[], AppError>> {
      const response = await remoteDataSource.getChains();

      if (!response.ok) return ok([NATIVE_SOLANA_CHAIN]);

      return map(response, (chains) => [NATIVE_SOLANA_CHAIN, ...chains.map(toChain)]);
    },

    async getAddress(chainCode: string): Promise<Result<DepositAddress | undefined, AppError>> {
      if (chainCode === NATIVE_CHAIN_CODE) {
        const response = await solanaWalletAddressPort.getSolanaAddress();

        return map(response, (address) =>
          address === undefined
            ? undefined
            : {
                chainCode: NATIVE_CHAIN_CODE,
                address,
                acceptedTokens: [...(CHAIN_METADATA['SOL']?.supportedTokens ?? ['USDC'])],
              },
        );
      }

      const response = await remoteDataSource.getAddress(chainCode);

      return map(response, (dto) => toDepositAddress(dto, chainCode));
    },
  };
}
