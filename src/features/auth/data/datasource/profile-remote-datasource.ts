import { fromZodError, type AppError } from '@/core/errors/app-error';
import type { HttpClient } from '@/core/network/http-client';
import { andThen, err, ok, type Result } from '@/core/result/result';
import { userProfileSchema, type UserProfileDto } from '../model/auth-model';
import { z } from 'zod';

const profileResponseSchema = z.object({
  data: userProfileSchema.default(() => userProfileSchema.parse({})),
});

export interface ProfileRemoteDataSource {
  getProfile(): Promise<Result<UserProfileDto, AppError>>;
}

export function createProfileRemoteDataSource(apiClient: HttpClient): ProfileRemoteDataSource {
  return {
    async getProfile() {
      const response = await apiClient.get<unknown>('/user/me');

      return andThen(response, (payload) => {
        const parsed = profileResponseSchema.safeParse(payload);
        return parsed.success ? ok(parsed.data.data) : err(fromZodError(parsed.error));
      });
    },
  };
}
