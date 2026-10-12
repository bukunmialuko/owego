import type { AppError } from '@/core/errors/app-error';
import type { HttpClient } from '@/core/network/http-client';
import { map, type Result } from '@/core/result/result';

export interface AccountRemoteDataSource {
  deleteAccount(): Promise<Result<void, AppError>>;
}

export function createAccountRemoteDataSource(apiClient: HttpClient): AccountRemoteDataSource {
  return {
    async deleteAccount() {
      return map(await apiClient.delete<unknown>('/user/account'), () => undefined);
    },
  };
}
