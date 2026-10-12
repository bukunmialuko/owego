import type { z } from 'zod';
import { fromZodError, unknownError, type AppError } from '@/core/errors/app-error';
import type { HttpClient } from '@/core/network/http-client';
import { andThen, err, ok, type Result } from '@/core/result/result';
import {
  latestBlockhashResultSchema,
  rpcEnvelopeSchema,
  signatureStatusesResultSchema,
  tokenAccountResultSchema,
  type LatestBlockhashDto,
  type SignatureStatusDto,
  type TokenAccountDto,
} from '../model/solana-rpc-model';

export interface SolanaRpcDataSource {
  getLatestBlockhash(): Promise<Result<LatestBlockhashDto, AppError>>;
  getTokenAccount(address: string): Promise<Result<TokenAccountDto | null, AppError>>;
  getSignatureStatus(signature: string): Promise<Result<SignatureStatusDto | null, AppError>>;
}

export function createSolanaRpcDataSource(rpcClient: HttpClient): SolanaRpcDataSource {
  async function call<T extends z.ZodType>(
    method: string,
    params: unknown[],
    schema: T,
  ): Promise<Result<z.infer<T>, AppError>> {
    const response = await rpcClient.post<unknown>('', { jsonrpc: '2.0', id: 1, method, params });

    return andThen(response, (payload) => {
      const envelope = rpcEnvelopeSchema.safeParse(payload);
      if (!envelope.success) return err(fromZodError(envelope.error));
      if (envelope.data.error !== undefined) {
        return err(unknownError(`json-rpc ${envelope.data.error.code}`));
      }

      const result = schema.safeParse(envelope.data.result);
      return result.success ? ok(result.data) : err(fromZodError(result.error));
    });
  }

  return {
    getLatestBlockhash() {
      return call('getLatestBlockhash', [{ commitment: 'confirmed' }], latestBlockhashResultSchema);
    },

    async getTokenAccount(address) {
      const result = await call(
        'getAccountInfo',
        [address, { encoding: 'jsonParsed', commitment: 'confirmed' }],
        tokenAccountResultSchema,
      );
      return andThen(result, ({ value }) => ok(value));
    },

    async getSignatureStatus(signature) {
      const result = await call(
        'getSignatureStatuses',
        [[signature], { searchTransactionHistory: false }],
        signatureStatusesResultSchema,
      );
      return andThen(result, ({ value }) =>
        value.length === 1
          ? ok(value[0] ?? null)
          : err(unknownError(`expected one status, got ${value.length}`)),
      );
    },
  };
}
