import { unknownError } from '@/core/errors/app-error';
import { andThen, err, map, ok } from '@/core/result/result';
import type { YieldRepository } from '../../domain/repository/yield-repository';
import type { YieldRemoteDataSource } from '../datasource/yield-remote-datasource';
import { toBroadcastStatus, toInitiation, toMoveBody } from '../mapper/move-mapper';
import { toProducts } from '../mapper/product-mapper';
import { toDepositQuote, toWithdrawalQuote } from '../mapper/quote-mapper';

export function createYieldRepositoryImpl({
  remote,
}: {
  remote: YieldRemoteDataSource;
}): YieldRepository {
  return {
    async getProducts() {
      return map(await remote.getOptions(), toProducts);
    },

    async quote({ kind, amountMinor }) {
      const quote =
        kind === 'deposit'
          ? map(await remote.getDepositQuote(amountMinor), (dto) =>
              toDepositQuote(dto, amountMinor),
            )
          : map(await remote.getWithdrawalQuote(amountMinor), (dto) =>
              toWithdrawalQuote(dto, amountMinor),
            );

      return andThen(quote, (value) =>
        value === undefined ? err(unknownError('yield quote unreadable')) : ok(value),
      );
    },

    async initiate(request) {
      return andThen(await remote.initiate(request.kind, toMoveBody(request)), (dto) => {
        const initiation = toInitiation(dto);

        return initiation === undefined
          ? err(unknownError('yield initiation incomplete'))
          : ok(initiation);
      });
    },

    async broadcast({ signedTransaction, transactionId }) {
      return map(
        await remote.broadcast({
          signed_transaction: signedTransaction,
          transaction_id: transactionId,
        }),
        toBroadcastStatus,
      );
    },
  };
}
