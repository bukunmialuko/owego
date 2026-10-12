import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { useResolve } from '@/core/di/container-provider';
import { unknownError, type AppError } from '@/core/errors/app-error';
import { err, type Result } from '@/core/result/result';
import type { DepositTokenSymbol } from '../../../domain/entity/deposit-token';
import { mayHaveMovedMoney, type DepositSubmission } from '../../../domain/entity/external-deposit';
import type { ExternalDepositRequest } from '../../../domain/usecase/submit-external-deposit-usecase';

type Answer = Result<DepositSubmission, AppError>;

type Typed = { tokenSymbol: DepositTokenSymbol; amountMinor: number };

export function useSubmitExternalDeposit() {
  const submitExternalDepositUseCase = useResolve('submitExternalDepositUseCase');
  const queryClient = useQueryClient();
  const isSubmitting = useRef(false);
  const pending = useRef<ExternalDepositRequest | undefined>(undefined);

  const mutation = useMutation<Answer, never, Typed>({
    mutationFn: async () => {
      const request = pending.current;
      pending.current = undefined;
      if (request === undefined) return err(unknownError('deposit submitted without a request'));

      return submitExternalDepositUseCase.execute(request);
    },
    onSettled: (answer) => {
      isSubmitting.current = false;
      if (answer?.ok === true && mayHaveMovedMoney(answer.value)) {
        void queryClient.invalidateQueries();
      }
    },
  });

  const { mutate } = mutation;

  const submit = useCallback(
    (request: ExternalDepositRequest) => {
      if (isSubmitting.current) return;
      isSubmitting.current = true;
      pending.current = request;
      mutate({ tokenSymbol: request.tokenSymbol, amountMinor: request.amountMinor });
    },
    [mutate],
  );

  return {
    submit,
    isSubmitting: mutation.isPending,
    answer: mutation.data,
    submitted: mutation.variables,
    reset: mutation.reset,
  };
}
