import { useCallback, useState } from 'react';
import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useResolve } from '@/core/di/container-provider';
import { AppErrorException } from '@/core/errors/app-error-exception';
import type { Transaction } from '../../domain/entity/home-entity';
import {
  flattenTransactionPages,
  type TransactionPage,
} from '../../domain/entity/transaction-page';

const historyQueryKey = ['home', 'transactions', 'history'] as const;

type History = InfiniteData<TransactionPage, number>;

function rowsOf(history: History): Transaction[] {
  return flattenTransactionPages(history.pages);
}

export function useTransactionHistory() {
  const getTransactionPageUseCase = useResolve('getTransactionPageUseCase');
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const query = useInfiniteQuery({
    queryKey: historyQueryKey,
    initialPageParam: 1,
    queryFn: async ({ pageParam }): Promise<TransactionPage> => {
      const result = await getTransactionPageUseCase.execute(pageParam);
      if (!result.ok) throw new AppErrorException(result.error);

      return result.value;
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    select: rowsOf,
  });

  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage, refetch } = query;

  const loadMore = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage || isFetchNextPageError) return;

    void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  const refresh = useCallback(() => {
    queryClient.setQueryData<History>(
      historyQueryKey,
      (history) =>
        history && { pages: history.pages.slice(0, 1), pageParams: history.pageParams.slice(0, 1) },
    );
    setIsRefreshing(true);

    void refetch().finally(() => {
      setIsRefreshing(false);
    });
  }, [queryClient, refetch]);

  return { ...query, loadMore, refresh, isRefreshing };
}
