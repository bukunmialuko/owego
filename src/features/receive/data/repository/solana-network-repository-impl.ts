import { unknownError } from '@/core/errors/app-error';
import { andThen, err, map } from '@/core/result/result';
import type { SolanaNetworkRepository } from '../../domain/repository/solana-network-repository';
import { findAssociatedTokenAddress } from '../adapter/solana-address';
import type { SolanaRpcDataSource } from '../datasource/solana-rpc-datasource';
import { toRecentBlockhash, toSignatureStatus, toTokenBalance } from '../mapper/solana-rpc-mapper';

export function createSolanaNetworkRepositoryImpl({
  solanaRpcDataSource,
}: {
  solanaRpcDataSource: SolanaRpcDataSource;
}): SolanaNetworkRepository {
  return {
    async getRecentBlockhash() {
      return map(await solanaRpcDataSource.getLatestBlockhash(), toRecentBlockhash);
    },

    async getTokenBalance(owner, token) {
      const account = findAssociatedTokenAddress(owner, token.mint);
      if (account === undefined) return err(unknownError('balance asked for a non-address'));

      const dto = await solanaRpcDataSource.getTokenAccount(account);
      return andThen(dto, (value) => toTokenBalance(value, token));
    },

    async getSignatureStatus(signature) {
      return map(await solanaRpcDataSource.getSignatureStatus(signature), toSignatureStatus);
    },
  };
}
