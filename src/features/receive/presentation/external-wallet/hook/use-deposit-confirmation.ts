import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useResolve } from '@/core/di/container-provider';
import { AppErrorException } from '@/core/errors/app-error-exception';
import type { DepositConfirmation } from '../../../domain/entity/external-deposit';

const CONFIRMATION = 'deposit-confirmation';

export function useDepositConfirmation(signature: string | null) {
  const awaitDepositConfirmationUseCase = useResolve('awaitDepositConfirmationUseCase');
  const queryClient = useQueryClient();

  const query = useQuery<DepositConfirmation>({
    queryKey: ['receive', CONFIRMATION, signature ?? ''],
    queryFn: async ({ signal }) => {
      const confirmation = await awaitDepositConfirmationUseCase.execute(signature ?? '', signal);
      if (!confirmation.ok) throw new AppErrorException(confirmation.error);

      return confirmation.value;
    },
    enabled: signature !== null,
    retry: false,
    staleTime: Infinity,
  });

  const isConfirmed = query.data === 'confirmed';
  useEffect(() => {
    if (!isConfirmed) return;
    void queryClient.invalidateQueries({
      predicate: (cached) => cached.queryKey[1] !== CONFIRMATION,
    });
  }, [isConfirmed, queryClient]);

  return query;
}
