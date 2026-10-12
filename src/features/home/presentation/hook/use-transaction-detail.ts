import { useQuery } from '@tanstack/react-query';
import { useResolve } from '@/core/di/container-provider';
import { AppErrorException } from '@/core/errors/app-error-exception';
import type { TransactionDetailView } from '../../domain/usecase/get-transaction-detail-usecase';

const transactionDetailQueryKey = (id: string) => ['home', 'transaction', id] as const;

export function useTransactionDetail(id: string) {
  const getTransactionDetailUseCase = useResolve('getTransactionDetailUseCase');

  return useQuery<TransactionDetailView>({
    queryKey: transactionDetailQueryKey(id),
    queryFn: async () => {
      const result = await getTransactionDetailUseCase.execute(id);
      if (!result.ok) throw new AppErrorException(result.error);

      return result.value;
    },
  });
}
