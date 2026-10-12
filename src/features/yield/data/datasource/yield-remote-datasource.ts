import { fromZodError, type AppError } from '@/core/errors/app-error';
import type { HttpClient } from '@/core/network/http-client';
import { andThen, err, ok, type Result } from '@/core/result/result';
import type { MovementKind } from '../../domain/entity/yield-entity';
import type { YieldMoveBody } from '../mapper/move-mapper';
import {
  depositQuoteResponseSchema,
  withdrawalQuoteResponseSchema,
  yieldBroadcastResponseSchema,
  yieldInitiationResponseSchema,
  type DepositQuoteDto,
  type WithdrawalQuoteDto,
  type YieldBroadcastDto,
  type YieldInitiationDto,
} from '../model/yield-move-model';
import { yieldOptionsResponseSchema, type TokenOptionDto } from '../model/yield-options-model';

export interface YieldRemoteDataSource {
  getOptions(): Promise<Result<TokenOptionDto[], AppError>>;
  getDepositQuote(amountMinor: number): Promise<Result<DepositQuoteDto, AppError>>;
  getWithdrawalQuote(amountMinor: number): Promise<Result<WithdrawalQuoteDto, AppError>>;
  initiate(kind: MovementKind, body: YieldMoveBody): Promise<Result<YieldInitiationDto, AppError>>;
  broadcast(body: {
    signed_transaction: string;
    transaction_id: string;
  }): Promise<Result<YieldBroadcastDto, AppError>>;
}

type Timeouts = {
  quoteTimeoutMs?: number;
  initiateTimeoutMs?: number;
  broadcastTimeoutMs?: number;
};

const MOVE_PATH: Record<MovementKind, string> = {
  deposit: '/yield/deposit',
  withdrawal: '/yield/withdraw',
};

function quotePath(path: string, amountMinor: number): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new RangeError('A yield quote is for a positive whole number of cents.');
  }

  return `${path}?amount=${String(amountMinor)}`;
}

function parsedWith<T>(schema: {
  safeParse(
    input: unknown,
  ):
    | { success: true; data: { data: T } }
    | { success: false; error: Parameters<typeof fromZodError>[0] };
}) {
  return (payload: unknown): Result<T, AppError> => {
    const parsed = schema.safeParse(payload);

    return parsed.success ? ok(parsed.data.data) : err(fromZodError(parsed.error));
  };
}

export function createYieldRemoteDataSource(
  { get, post }: Pick<HttpClient, 'get' | 'post'>,
  {
    quoteTimeoutMs = 30_000,
    initiateTimeoutMs = 30_000,
    broadcastTimeoutMs = 120_000,
  }: Timeouts = {},
): YieldRemoteDataSource {
  return {
    async getOptions() {
      return andThen(await get<unknown>('/yield/options'), parsedWith(yieldOptionsResponseSchema));
    },

    async getDepositQuote(amountMinor) {
      return andThen(
        await get<unknown>(quotePath('/yield/deposit/quote', amountMinor), {
          timeoutMs: quoteTimeoutMs,
        }),
        parsedWith(depositQuoteResponseSchema),
      );
    },

    async getWithdrawalQuote(amountMinor) {
      return andThen(
        await get<unknown>(quotePath('/yield/withdraw/quote', amountMinor), {
          timeoutMs: quoteTimeoutMs,
        }),
        parsedWith(withdrawalQuoteResponseSchema),
      );
    },

    async initiate(kind, body) {
      return andThen(
        await post<unknown>(MOVE_PATH[kind], body, { timeoutMs: initiateTimeoutMs }),
        parsedWith(yieldInitiationResponseSchema),
      );
    },

    async broadcast(body) {
      return andThen(
        await post<unknown>('/yield/broadcast', body, { timeoutMs: broadcastTimeoutMs }),
        parsedWith(yieldBroadcastResponseSchema),
      );
    },
  };
}
