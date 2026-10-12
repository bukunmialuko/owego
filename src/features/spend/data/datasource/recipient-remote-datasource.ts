import { fromZodError, unknownError, type AppError } from '@/core/errors/app-error';
import type { HttpClient } from '@/core/network/http-client';
import { andThen, err, ok, type Result } from '@/core/result/result';
import type { CreateQrRecipientBody, CreateRecipientBody } from '../mapper/recipient-mapper';
import {
  recipientPageResponseSchema,
  recipientResponseSchema,
  removeRecipientResponseSchema,
  type RecipientDto,
} from '../model/recipient-model';

export type RecipientPageDto = {
  rows: RecipientDto[];
  next: string | undefined;
};

const EVERY_TYPE = 'type=all';

export interface RecipientRemoteDataSource {
  getPage(page: number): Promise<Result<RecipientPageDto, AppError>>;
  getRecent(): Promise<Result<RecipientDto[], AppError>>;
  getById(id: string): Promise<Result<RecipientDto, AppError>>;
  create(
    body: CreateRecipientBody | CreateQrRecipientBody,
  ): Promise<Result<RecipientDto, AppError>>;
  remove(id: string): Promise<Result<void, AppError>>;
}

export function createRecipientRemoteDataSource(
  apiClient: Pick<HttpClient, 'get' | 'post' | 'delete'>,
): RecipientRemoteDataSource {
  return {
    async getPage(page) {
      const response = await apiClient.get<unknown>(
        `/recipient?page=${String(page)}&${EVERY_TYPE}`,
      );

      return andThen(response, (payload) => {
        const parsed = recipientPageResponseSchema.safeParse(payload);
        if (!parsed.success) return err(fromZodError(parsed.error));

        return ok({ rows: parsed.data.data, next: parsed.data.meta?.next });
      });
    },

    async getRecent() {
      const response = await apiClient.get<unknown>(`/recipient/recent?${EVERY_TYPE}`);

      return andThen(response, (payload) => {
        const parsed = recipientPageResponseSchema.safeParse(payload);

        return parsed.success ? ok(parsed.data.data) : err(fromZodError(parsed.error));
      });
    },

    async getById(id) {
      const response = await apiClient.get<unknown>(`/recipient/${encodeURIComponent(id)}`);

      return andThen(response, (payload) => {
        const parsed = recipientResponseSchema.safeParse(payload);

        return parsed.success ? ok(parsed.data.data) : err(fromZodError(parsed.error));
      });
    },

    async create(body) {
      const response = await apiClient.post<unknown>('/recipient', body);

      return andThen(response, (payload) => {
        const parsed = recipientResponseSchema.safeParse(payload);

        return parsed.success ? ok(parsed.data.data) : err(fromZodError(parsed.error));
      });
    },

    async remove(id) {
      const response = await apiClient.delete<unknown>(`/recipient/${encodeURIComponent(id)}`);

      return andThen(response, (payload) => {
        if (typeof payload !== 'object' || payload === null) return ok(undefined);

        const parsed = removeRecipientResponseSchema.safeParse(payload);
        if (!parsed.success) return err(fromZodError(parsed.error));

        return parsed.data.error
          ? err(unknownError('The server refused to remove the recipient.'))
          : ok(undefined);
      });
    },
  };
}
