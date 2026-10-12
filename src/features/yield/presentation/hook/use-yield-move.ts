import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AwilixContainer } from 'awilix';
import { useCallback, useRef, useState } from 'react';
import type { AppCradle } from '@/core/di/container';
import { useContainer, useResolve } from '@/core/di/container-provider';
import { fromUnknown, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { YieldTarget } from '../../domain/entity/yield-entity';
import { endingOf, type YieldMoveOutcome } from '../../domain/entity/yield-move-outcome';
import type { YieldQuote } from '../../domain/entity/yield-quote';
import type {
  PrepareYieldMoveUseCase,
  PreparedYieldMove,
} from '../../domain/usecase/prepare-yield-move-usecase';

type Answer = Result<YieldMoveOutcome, AppError>;

export type YieldMoveStep = 'signing' | 'broadcasting';

export function useYieldMove({ target, quote }: { target: YieldTarget; quote: YieldQuote }) {
  const container = useContainer();
  const queryClient = useQueryClient();
  const appLockHold = useResolve('appLockHold');
  const prepared = useRef<PreparedYieldMove | undefined>(undefined);
  const isConfirming = useRef(false);
  const [step, setStep] = useState<YieldMoveStep | undefined>(undefined);

  const mutation = useMutation<Answer, never, undefined>({
    mutationFn: async () => {
      const release = appLockHold.hold();
      try {
        if (prepared.current === undefined) {
          const useCase = resolvePrepare(container);
          if (!useCase.ok) return useCase;

          const ready = useCase.value.prepare({ target, quote });
          if (!ready.ok) return ready;
          prepared.current = ready.value;
        }

        setStep('signing');

        return ok(
          await prepared.current.confirm({
            onBroadcasting: () => {
              setStep('broadcasting');
            },
          }),
        );
      } catch (cause) {
        return err(fromUnknown(cause));
      } finally {
        release();
        setStep(undefined);
      }
    },
    onSettled: (answer) => {
      isConfirming.current = false;
      if (answer?.ok === true && endingOf(answer.value) !== undefined) {
        void queryClient.invalidateQueries();
      }
    },
  });

  const { mutate } = mutation;

  const confirm = useCallback(() => {
    if (isConfirming.current) return;
    isConfirming.current = true;
    mutate(undefined);
  }, [mutate]);

  return { confirm, isConfirming: mutation.isPending, step, answer: mutation.data };
}

function resolvePrepare(
  container: AwilixContainer<AppCradle>,
): Result<PrepareYieldMoveUseCase, AppError> {
  try {
    return ok(container.resolve('prepareYieldMoveUseCase'));
  } catch (cause) {
    return err(fromUnknown(cause));
  }
}
