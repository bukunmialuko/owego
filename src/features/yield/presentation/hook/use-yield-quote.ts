import { useCallback, useRef, useState } from 'react';
import { useContainer } from '@/core/di/container-provider';
import { fromUnknown, type AppError } from '@/core/errors/app-error';
import { err, type Result } from '@/core/result/result';
import type { MovementKind, YieldTarget } from '../../domain/entity/yield-entity';
import type {
  DepositQuoteDecision,
  WithdrawalQuoteDecision,
} from '../../domain/entity/yield-quote';

export type QuoteAnswer = Result<DepositQuoteDecision | WithdrawalQuoteDecision, AppError>;

export function useYieldQuote() {
  const container = useContainer();
  const isQuoting = useRef(false);
  const [isPending, setIsPending] = useState(false);

  const quote = useCallback(
    async (
      kind: MovementKind,
      target: YieldTarget,
      amountMinor: number,
    ): Promise<QuoteAnswer | undefined> => {
      if (isQuoting.current) return undefined;
      isQuoting.current = true;
      setIsPending(true);

      try {
        return kind === 'deposit'
          ? await container.resolve('quoteYieldDepositUseCase').execute({ target, amountMinor })
          : await container.resolve('quoteYieldWithdrawalUseCase').execute({ target, amountMinor });
      } catch (cause) {
        return err(fromUnknown(cause));
      } finally {
        isQuoting.current = false;
        setIsPending(false);
      }
    },
    [container],
  );

  return { quote, isQuoting: isPending };
}
