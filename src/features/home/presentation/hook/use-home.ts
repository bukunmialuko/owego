import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useResolve } from '@/core/di/container-provider';
import { AppErrorException } from '@/core/errors/app-error-exception';
import { PAYEE_QUERY_ROOT, type Payee } from '@/core/payee/payee';
import type { Transaction, VerificationNotice } from '../../domain/entity/home-entity';

const RECENT_LIMIT = 5;

const QUICK_SEND_LIMIT = 5;

const homeQueryKey = {
  transactions: ['home', 'transactions', RECENT_LIMIT] as const,
  fxQuote: (base: string, quote: string) => ['home', 'fx', base, quote] as const,
  verification: ['home', 'verification'] as const,
  quickSend: [...PAYEE_QUERY_ROOT, 'quick-send', QUICK_SEND_LIMIT] as const,
};

export function useRecentTransactions() {
  const transactionRepository = useResolve('transactionRepository');

  return useQuery<Transaction[]>({
    queryKey: homeQueryKey.transactions,
    queryFn: async () => {
      const result = await transactionRepository.getRecent(RECENT_LIMIT);
      if (!result.ok) throw new AppErrorException(result.error);

      return result.value;
    },
  });
}

export function useVerificationNotice() {
  const verificationRepository = useResolve('verificationRepository');

  return useQuery<VerificationNotice | null>({
    queryKey: homeQueryKey.verification,
    queryFn: async () => {
      const result = await verificationRepository.getNotice();
      if (!result.ok) throw new AppErrorException(result.error);

      return result.value ?? null;
    },
  });
}

export function useQuickSendPayees() {
  const payeePort = useResolve('payeePort');

  return useQuery<Payee[]>({
    queryKey: homeQueryKey.quickSend,
    queryFn: async () => {
      const result = await payeePort.getRecent(QUICK_SEND_LIMIT);
      if (!result.ok) throw new AppErrorException(result.error);

      return result.value;
    },
  });
}

export function useHomeRefresh() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const runRefresh = useCallback((tasks: Promise<unknown>[]) => {
    setIsRefreshing(true);

    void Promise.allSettled(tasks).finally(() => {
      setIsRefreshing(false);
    });
  }, []);

  return { isRefreshing, runRefresh };
}
