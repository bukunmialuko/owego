import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useResolve } from '@/core/di/container-provider';
import { AppErrorException } from '@/core/errors/app-error-exception';
import { PAYEE_QUERY_ROOT } from '@/core/payee/payee';
import type {
  SavePaidRecipientInput,
  SavePaidRecipientOutcome,
} from '../../domain/usecase/save-paid-recipient-usecase';

export function useSavePaidRecipient() {
  const savePaidRecipientUseCase = useResolve('savePaidRecipientUseCase');
  const queryClient = useQueryClient();

  const { mutate } = useMutation<SavePaidRecipientOutcome, Error, SavePaidRecipientInput>({
    mutationFn: async (input) => {
      const result = await savePaidRecipientUseCase.execute(input);
      if (!result.ok) throw new AppErrorException(result.error);

      return result.value;
    },
    onSuccess: async (outcome) => {
      if (outcome.kind === 'saved')
        await queryClient.invalidateQueries({ queryKey: PAYEE_QUERY_ROOT });
    },
  });

  return mutate;
}
