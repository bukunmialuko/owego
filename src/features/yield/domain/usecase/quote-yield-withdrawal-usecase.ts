import { isServerRefusal, unknownError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { YieldOverviewRepository } from '@/core/yield/yield-overview';
import type { YieldTarget } from '../entity/yield-entity';
import type { WithdrawalQuoteDecision } from '../entity/yield-quote';
import type { YieldRepository } from '../repository/yield-repository';

export interface QuoteYieldWithdrawalUseCase {
  execute(request: {
    target: YieldTarget;
    amountMinor: number;
  }): Promise<Result<WithdrawalQuoteDecision, AppError>>;
}

export function createQuoteYieldWithdrawalUseCase({
  yieldRepository,
  yieldOverviewRepository,
}: {
  yieldRepository: YieldRepository;
  yieldOverviewRepository: YieldOverviewRepository;
}): QuoteYieldWithdrawalUseCase {
  return {
    async execute({ target, amountMinor }) {
      if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
        return err(unknownError('yield withdrawal: the amount is not a whole number of cents'));
      }

      const overview = await yieldOverviewRepository.getOverview();
      if (!overview.ok) return overview;

      const positionMinor =
        overview.value.positions.find((position) => position.id === target.vaultId)?.valueMinor ??
        0;
      if (amountMinor > positionMinor) return ok({ type: 'exceedsPosition' });

      const quoted = await yieldRepository.quote({ kind: 'withdrawal', amountMinor });
      if (!quoted.ok) {
        return isServerRefusal(quoted.error) ? ok({ type: 'refused' }) : quoted;
      }
      if (quoted.value.feeMinor >= amountMinor) {
        return ok({ type: 'notAboveFee', feeMinor: quoted.value.feeMinor });
      }

      return ok({ type: 'quoted', quote: quoted.value });
    },
  };
}
