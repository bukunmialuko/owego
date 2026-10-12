import type { AppError } from '@/core/errors/app-error';
import { ok, type Result } from '@/core/result/result';
import type { CircleWalletPort } from '../../domain/port/circle-wallet-port';
import type { WalletRepository } from '../../domain/repository/wallet-repository';

type Outcome =
  { type: 'changed' } | { type: 'cancelled' } | { type: 'expired' } | { type: 'failed' };

export function createSettingsPinAdapter(
  walletRepository: WalletRepository,
  circleWalletPort: CircleWalletPort,
) {
  return {
    async changePin(): Promise<Result<Outcome, AppError>> {
      const challenge = await walletRepository.createPinChangeChallenge();
      if (!challenge.ok) return challenge;

      const executed = await circleWalletPort.executeChallenge(challenge.value);
      if (!executed.ok) return executed;

      const outcome = executed.value;

      if (outcome.type === 'cancelled') return ok({ type: 'cancelled' });
      if (outcome.type === 'failed') return ok({ type: 'failed' });

      if (outcome.status === 'complete') return ok({ type: 'changed' });
      if (outcome.status === 'expired') return ok({ type: 'expired' });

      return ok({ type: 'failed' });
    },
  };
}
