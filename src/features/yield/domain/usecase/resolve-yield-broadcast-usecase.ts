import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type { YieldBroadcastStatus } from '../entity/yield-move';
import type { YieldMoveOutcome } from '../entity/yield-move-outcome';

export function resolveYieldBroadcast(
  answer: Result<YieldBroadcastStatus, AppError>,
): YieldMoveOutcome {
  if (!answer.ok) return { type: 'unconfirmed' };

  switch (answer.value) {
    case 'succeeded':
      return { type: 'succeeded' };
    case 'pending':
      return { type: 'processing' };
    case 'failed':
      return { type: 'failedOnChain' };
    case 'unknown':
      return { type: 'unconfirmed' };
  }
}
