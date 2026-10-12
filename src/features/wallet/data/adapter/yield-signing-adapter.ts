import type { AppError } from '@/core/errors/app-error';
import { map, type Result } from '@/core/result/result';
import type { WalletChallenge } from '../../domain/entity/wallet-entity';
import type {
  CircleChallengeOutcome,
  CircleExecuteStatus,
  CircleFailureReason,
  CircleWalletPort,
} from '../../domain/port/circle-wallet-port';

type YieldSigningOutcome =
  | {
      type: 'settled';
      status: CircleExecuteStatus;
      resultType: 'signature' | 'transaction' | 'other';
      signedTransaction?: string;
    }
  | { type: 'cancelled' }
  | { type: 'failed'; reason: CircleFailureReason };

export function createYieldSigningAdapter(circleWalletPort: CircleWalletPort) {
  return {
    async sign(challenge: WalletChallenge): Promise<Result<YieldSigningOutcome, AppError>> {
      return map(await circleWalletPort.executeChallenge(challenge), toYieldSigningOutcome);
    },
  };
}

function toYieldSigningOutcome(outcome: CircleChallengeOutcome): YieldSigningOutcome {
  switch (outcome.type) {
    case 'cancelled':
      return { type: 'cancelled' };
    case 'failed':
      return { type: 'failed', reason: outcome.reason };
    case 'settled':
      if (outcome.resultType === 'sign-transaction') {
        return {
          type: 'settled',
          status: outcome.status,
          resultType: 'signature',
          ...(outcome.signedTransaction === undefined
            ? {}
            : { signedTransaction: outcome.signedTransaction }),
        };
      }

      return {
        type: 'settled',
        status: outcome.status,
        resultType: outcome.resultType === 'create-transaction' ? 'transaction' : 'other',
      };
  }
}
