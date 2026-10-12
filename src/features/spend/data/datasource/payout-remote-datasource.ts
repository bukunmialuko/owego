import type { z } from 'zod';
import { fromZodError, type AppError } from '@/core/errors/app-error';
import type { HttpClient } from '@/core/network/http-client';
import { andThen, err, ok, type Result } from '@/core/result/result';
import { qrPayResponseSchema, type QrPayDto } from '../model/qr-pay-model';
import { walletToBankResponseSchema, type WalletToBankDto } from '../model/wallet-to-bank-model';

const INITIATION_TIMEOUT_MS = 30_000;

export interface PayoutRemoteDataSource {
  walletToBank(body: Record<string, unknown>): Promise<Result<WalletToBankDto, AppError>>;
  qrPay(body: Record<string, unknown>): Promise<Result<QrPayDto, AppError>>;
}

export function createPayoutRemoteDataSource(
  { post }: Pick<HttpClient, 'post'>,
  { timeoutMs = INITIATION_TIMEOUT_MS }: { timeoutMs?: number } = {},
): PayoutRemoteDataSource {
  async function initiate<T>(
    path: string,
    body: Record<string, unknown>,
    schema: z.ZodType<{ data: T }>,
  ): Promise<Result<T, AppError>> {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await post<unknown>(path, body, { signal: controller.signal });

      return andThen(response, (payload) => {
        const parsed = schema.safeParse(payload);

        return parsed.success ? ok(parsed.data.data) : err(fromZodError(parsed.error));
      });
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    walletToBank: (body) =>
      initiate('/transaction/wallet-to-bank', body, walletToBankResponseSchema),
    qrPay: (body) => initiate('/transaction/qr-pay', body, qrPayResponseSchema),
  };
}
