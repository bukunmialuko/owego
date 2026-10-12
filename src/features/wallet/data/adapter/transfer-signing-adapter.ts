import type { AppError } from '@/core/errors/app-error';
import { map, type Result } from '@/core/result/result';
import type { WalletChallenge } from '../../domain/entity/wallet-entity';
import type {
  CircleChallengeOutcome,
  CircleExecuteStatus,
  CircleFailureReason,
  CircleWalletPort,
} from '../../domain/port/circle-wallet-port';

type SigningOutcome =
  | { type: 'settled'; status: CircleExecuteStatus; resultType: 'transaction' | 'other' }
  | { type: 'cancelled' }
  | { type: 'failed'; reason: CircleFailureReason };

export function createTransferSigningAdapter(circleWalletPort: CircleWalletPort) {
  return {
    async sign(challenge: WalletChallenge): Promise<Result<SigningOutcome, AppError>> {
      return map(await circleWalletPort.executeChallenge(challenge), toSigningOutcome);
    },
  };
}

function toSigningOutcome(outcome: CircleChallengeOutcome): SigningOutcome {
  switch (outcome.type) {
    case 'cancelled':
      return { type: 'cancelled' };
    case 'failed':
      return { type: 'failed', reason: outcome.reason };
    case 'settled':
      return {
        type: 'settled',
        status: outcome.status,
        resultType: outcome.resultType === 'create-transaction' ? 'transaction' : 'other',
      };
  }
}
