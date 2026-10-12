import { fromZodError, type AppError } from '@/core/errors/app-error';
import type { HttpClient } from '@/core/network/http-client';
import type { ChainDto } from '@/core/reference-data/reference-data-model';
import { andThen, err, ok, type Result } from '@/core/result/result';
import {
  chainListResponseSchema,
  depositAddressResponseSchema,
  type DepositAddressDto,
} from '../model/receive-model';

export interface ReceiveRemoteDataSource {
  getChains(): Promise<Result<ChainDto[], AppError>>;
  getAddress(chainCode: string): Promise<Result<DepositAddressDto, AppError>>;
}

export function createReceiveRemoteDataSource(apiClient: HttpClient): ReceiveRemoteDataSource {
  return {
    async getChains() {
      const response = await apiClient.get<unknown>('/deposit-wallet/chains');

      return andThen(response, (payload) => {
        const parsed = chainListResponseSchema.safeParse(payload);
        return parsed.success ? ok(parsed.data.data) : err(fromZodError(parsed.error));
      });
    },

    async getAddress(chainCode) {
      const response = await apiClient.post<unknown>('/deposit-wallet', { chain: chainCode });

      return andThen(response, (payload) => {
        const parsed = depositAddressResponseSchema.safeParse(payload);
        return parsed.success ? ok(parsed.data.data) : err(fromZodError(parsed.error));
      });
    },
  };
}
