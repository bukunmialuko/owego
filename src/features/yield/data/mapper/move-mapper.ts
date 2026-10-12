import type {
  YieldBroadcastStatus,
  YieldInitiation,
  YieldMoveRequest,
} from '../../domain/entity/yield-move';
import type { YieldBroadcastDto, YieldInitiationDto } from '../model/yield-move-model';

export type YieldMoveBody = { amount: number; token: string; token_id: string };

export function toMoveBody(request: YieldMoveRequest): YieldMoveBody {
  if (!Number.isSafeInteger(request.amountMinor) || request.amountMinor <= 0) {
    throw new RangeError('A yield move is a positive whole number of cents.');
  }

  return { amount: request.amountMinor, token: request.tokenSymbol, token_id: request.tokenMint };
}

export function toInitiation(dto: YieldInitiationDto): YieldInitiation | undefined {
  const { challenge_id, user_token, encryption_key, transaction_id } = dto;
  if ([challenge_id, user_token, encryption_key, transaction_id].includes('')) return undefined;

  return {
    challenge: { challengeId: challenge_id, userToken: user_token, encryptionKey: encryption_key },
    transactionId: transaction_id,
  };
}

const SUCCEEDED = ['success', 'successful', 'succeeded', 'confirmed', 'completed'];
const PENDING = ['pending', 'processing', 'submitted'];
const FAILED = ['failed', 'failure'];

export function toBroadcastStatus(dto: YieldBroadcastDto): YieldBroadcastStatus {
  const status = dto.status.toLowerCase();
  if (SUCCEEDED.includes(status)) return 'succeeded';
  if (PENDING.includes(status)) return 'pending';
  if (FAILED.includes(status)) return 'failed';

  return 'unknown';
}
