import type { AppError } from '@/core/errors/app-error';
import type { HttpClient } from '@/core/network/http-client';
import { map, type Result } from '@/core/result/result';

export interface PushTokenRemoteDataSource {
  register(token: string): Promise<Result<void, AppError>>;
  unregister(accessToken: string): Promise<Result<void, AppError>>;
}

export function createPushTokenRemoteDataSource(
  apiClient: HttpClient,
  publicApiClient: HttpClient,
): PushTokenRemoteDataSource {
  return {
    async register(token) {
      return map(await apiClient.post<unknown>('/user/push/token', { token }), () => undefined);
    },

    async unregister(accessToken) {
      return map(
        await publicApiClient.delete<unknown>('/user/push/token', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        () => undefined,
      );
    },
  };
}
