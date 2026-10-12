import type { AppError } from '@/core/errors/app-error';
import { ok, type Result } from '@/core/result/result';
import type {
  CircleExecuteStatus,
  CircleFailureReason,
  CircleWalletPort,
} from '../port/circle-wallet-port';
import type { WalletRepository } from '../repository/wallet-repository';

export type CreateWalletOutcome =
  | { type: 'provisioning' }
  | { type: 'provisioning-unconfirmed' }
  | { type: 'cancelled' }
  | { type: 'setup-incomplete' }
  | { type: 'challenge-unavailable' }
  | { type: 'refused'; error: AppError }
  | { type: 'failed'; reason: CircleFailureReason; message: string };

type Dependencies = {
  walletRepository: WalletRepository;
  circleWalletPort: CircleWalletPort;
};

export interface CreateWalletUseCase {
  execute(): Promise<Result<CreateWalletOutcome, AppError>>;
}

export function createCreateWalletUseCase({
  walletRepository,
  circleWalletPort,
}: Dependencies): CreateWalletUseCase {
  async function attempt(canRetry: boolean): Promise<Result<CreateWalletOutcome, AppError>> {
    const challenge = await walletRepository.createChallenge();

    if (!challenge.ok) {
      return ok(
        challenge.error.retryable
          ? { type: 'challenge-unavailable' }
          : { type: 'refused', error: challenge.error },
      );
    }

    const executed = await circleWalletPort.executeChallenge(challenge.value);

    if (!executed.ok) return executed;

    switch (executed.value.type) {
      case 'cancelled':
        return ok({ type: 'cancelled' });

      case 'settled':
        return ok(fromStatus(executed.value.status));

      case 'failed':
        if (executed.value.reason === 'challenge-invalid') {
          return canRetry ? attempt(false) : ok({ type: 'challenge-unavailable' });
        }

        return ok({
          type: 'failed',
          reason: executed.value.reason,
          message: executed.value.message,
        });
    }
  }

  return {
    execute: () => attempt(true),
  };
}

function fromStatus(status: CircleExecuteStatus): CreateWalletOutcome {
  switch (status) {
    case 'failed':
    case 'expired':
      return { type: 'setup-incomplete' };

    case 'unknown':
      return { type: 'provisioning-unconfirmed' };

    case 'complete':
    case 'pending':
    case 'in-progress':
      return { type: 'provisioning' };
  }
}
