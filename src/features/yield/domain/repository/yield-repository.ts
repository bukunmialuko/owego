import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type { MovementKind, YieldProduct } from '../entity/yield-entity';
import type {
  SignedYieldMove,
  YieldBroadcastStatus,
  YieldInitiation,
  YieldMoveRequest,
} from '../entity/yield-move';
import type { YieldQuote } from '../entity/yield-quote';

export interface YieldRepository {
  getProducts(): Promise<Result<YieldProduct[], AppError>>;
  quote(request: {
    kind: MovementKind;
    amountMinor: number;
  }): Promise<Result<YieldQuote, AppError>>;
  initiate(request: YieldMoveRequest): Promise<Result<YieldInitiation, AppError>>;
  broadcast(move: SignedYieldMove): Promise<Result<YieldBroadcastStatus, AppError>>;
}
