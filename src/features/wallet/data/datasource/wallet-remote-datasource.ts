import { fromZodError, type AppError } from '@/core/errors/app-error';
import type { HttpClient } from '@/core/network/http-client';
import { andThen, err, ok, type Result } from '@/core/result/result';
import type { WalletListRequest } from '../../domain/repository/wallet-repository';
import {
  walletChallengeResponseSchema,
  walletListResponseSchema,
  type WalletChallengeDto,
  type WalletDto,
} from '../model/wallet-model';

export interface WalletRemoteDataSource {
  getWallets(request?: WalletListRequest): Promise<Result<WalletDto[], AppError>>;
  createChallenge(): Promise<Result<WalletChallengeDto, AppError>>;
  createPinChangeChallenge(): Promise<Result<WalletChallengeDto, AppError>>;
}

function parseChallenge(response: Result<unknown, AppError>): Result<WalletChallengeDto, AppError> {
  return andThen(response, (payload) => {
    const parsed = walletChallengeResponseSchema.safeParse(payload);
    return parsed.success ? ok(parsed.data.data) : err(fromZodError(parsed.error));
  });
}

export function createWalletRemoteDataSource(apiClient: HttpClient): WalletRemoteDataSource {
  return {
    async getWallets(request = {}) {
      const response = await apiClient.get<unknown>('/user/wallets', request);

      return andThen(response, (payload) => {
        const parsed = walletListResponseSchema.safeParse(payload);
        return parsed.success ? ok(parsed.data.data) : err(fromZodError(parsed.error));
      });
    },

    async createChallenge() {
      return parseChallenge(await apiClient.post<unknown>('/user/wallet/challenge'));
    },

    async createPinChangeChallenge() {
      return parseChallenge(await apiClient.post<unknown>('/user/wallet/pin'));
    },
  };
}
