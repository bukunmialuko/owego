import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AwilixContainer } from 'awilix';
import { useCallback, useRef } from 'react';
import type { AppCradle } from '@/core/di/container';
import { useContainer } from '@/core/di/container-provider';
import { fromUnknown, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import { mayHaveMovedMoney, type SendOutcome } from '../../../domain/entity/send-outcome';
import type { PaidRecipient } from '../../../domain/usecase/save-paid-recipient-usecase';
import type {
  SendAssetRequest,
  SendAssetUseCase,
} from '../../../domain/usecase/send-asset-usecase';
import { useSavePaidRecipient } from '../../hook/use-save-paid-recipient';

type Answer = Result<SendOutcome, AppError>;

type Saving = { recipient: PaidRecipient; saveAsBeneficiary: boolean };

type Send = { request: SendAssetRequest; saving: Saving };

export function useSendAsset() {
  const container = useContainer();
  const queryClient = useQueryClient();
  const isSending = useRef(false);
  const savePaidRecipient = useSavePaidRecipient();

  const mutation = useMutation<Answer, never, Send>({
    mutationFn: async ({ request }) => {
      const useCase = resolveSend(container);
      if (!useCase.ok) return useCase;

      return useCase.value.execute(request);
    },
    onSettled: (answer, _error, variables) => {
      isSending.current = false;
      if (answer === undefined || !answer.ok) return;

      savePaidRecipient({ ...variables.saving, outcome: answer.value });
      if (mayHaveMovedMoney(answer.value)) void queryClient.invalidateQueries();
    },
  });

  const { mutate } = mutation;

  const send = useCallback(
    (request: SendAssetRequest, saving: Saving) => {
      if (isSending.current) return;
      isSending.current = true;
      mutate({ request, saving });
    },
    [mutate],
  );

  return { send, isSending: mutation.isPending, answer: mutation.data };
}

function resolveSend(container: AwilixContainer<AppCradle>): Result<SendAssetUseCase, AppError> {
  try {
    return ok(container.resolve('sendAssetUseCase'));
  } catch (cause) {
    return err(fromUnknown(cause));
  }
}
