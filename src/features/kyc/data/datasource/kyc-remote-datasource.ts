import { fromZodError, type AppError } from '@/core/errors/app-error';
import type { HttpClient } from '@/core/network/http-client';
import { andThen, err, ok, type Result } from '@/core/result/result';
import { diditSessionSchema, type DiditSessionDto } from '../model/didit-session-model';

export interface KycRemoteDataSource {
  createSession(): Promise<Result<DiditSessionDto, AppError>>;
}

export function createKycRemoteDataSource(apiClient: HttpClient): KycRemoteDataSource {
  return {
    async createSession() {
      const response = await apiClient.post<unknown>('/user/kyc/didit/session');

      return andThen(response, (payload) => {
        const parsed = diditSessionSchema.safeParse(payload);
        return parsed.success ? ok(parsed.data) : err(fromZodError(parsed.error));
      });
    },
  };
}
