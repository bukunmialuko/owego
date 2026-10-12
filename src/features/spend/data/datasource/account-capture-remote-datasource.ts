import { fromZodError, type AppError } from '@/core/errors/app-error';
import type { HttpClient } from '@/core/network/http-client';
import { andThen, err, ok, type Result } from '@/core/result/result';
import type { CapturedStill } from '../../domain/port/camera-scanner-port';
import {
  capturedAccountResponseSchema,
  type CapturedAccountDto,
} from '../model/captured-account-model';

const IMAGE_PART = 'image';

const FILE_NAME = 'capture.jpg';

export interface AccountCaptureRemoteDataSource {
  readAccount(still: CapturedStill): Promise<Result<CapturedAccountDto, AppError>>;
}

export function createAccountCaptureRemoteDataSource({
  post,
}: Pick<HttpClient, 'post'>): AccountCaptureRemoteDataSource {
  return {
    async readAccount(still) {
      const form = new FormData();

      form.append(IMAGE_PART, {
        uri: still.uri,
        name: FILE_NAME,
        type: still.mimeType,
      });

      const response = await post<unknown>('/transaction/ocr', form);

      return andThen(response, (payload) => {
        const parsed = capturedAccountResponseSchema.safeParse(payload);

        return parsed.success ? ok(parsed.data.data) : err(fromZodError(parsed.error));
      });
    },
  };
}
