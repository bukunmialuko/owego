import { fromZodError, type AppError } from '@/core/errors/app-error';
import type { HttpClient } from '@/core/network/http-client';
import { andThen, err, ok, type Result } from '@/core/result/result';
import {
  transferChallengeResponseSchema,
  type TransferChallengeDto,
} from '../model/transfer-challenge-model';

export type TransferChallengeBody = {
  wallet_id: string;
  amount: string;
  destination_address: string;
  token_id: string;
};

const CHALLENGE_TIMEOUT_MS = 30_000;

export interface TransferChallengeRemoteDataSource {
  create(body: TransferChallengeBody): Promise<Result<TransferChallengeDto, AppError>>;
}

export function createTransferChallengeRemoteDataSource(
  { post }: Pick<HttpClient, 'post'>,
  { timeoutMs = CHALLENGE_TIMEOUT_MS }: { timeoutMs?: number } = {},
): TransferChallengeRemoteDataSource {
  return {
    async create(body) {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        controller.abort();
      }, timeoutMs);

      try {
        const response = await post<unknown>('/transaction/challenge-id', body, {
          signal: controller.signal,
        });

        return andThen(response, (payload) => {
          const parsed = transferChallengeResponseSchema.safeParse(payload);

          return parsed.success ? ok(parsed.data.data) : err(fromZodError(parsed.error));
        });
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
