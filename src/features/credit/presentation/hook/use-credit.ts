import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useResolve } from '@/core/di/container-provider';
import { AppErrorException } from '@/core/errors/app-error-exception';
import type { Result } from '@/core/result/result';
import type { AppError } from '@/core/errors/app-error';
import type {
  CreditScore,
  Loan,
  LoanHistory,
  LoanMovement,
  LoanOffer,
  LoanQuote,
} from '../../domain/entity/credit-entity';

const creditQueryKey = {
  score: ['credit', 'score'] as const,
  activeLoan: ['credit', 'active-loan'] as const,
  history: ['credit', 'history'] as const,
  movements: ['credit', 'movements'] as const,
  offer: ['credit', 'offer'] as const,
  quote: (principalMinor: number) => ['credit', 'quote', principalMinor] as const,
};

function unwrap<T>(result: Result<T, AppError>): T {
  if (!result.ok) throw new AppErrorException(result.error);

  return result.value;
}

function unwrapOptional<T>(result: Result<T | undefined, AppError>): T | null {
  return unwrap(result) ?? null;
}

export function useCreditScore() {
  const creditRepository = useResolve('creditRepository');

  return useQuery<CreditScore | null>({
    queryKey: creditQueryKey.score,
    queryFn: async () => unwrapOptional(await creditRepository.getScore()),
  });
}

export function useActiveLoan() {
  const creditRepository = useResolve('creditRepository');

  return useQuery<Loan | null>({
    queryKey: creditQueryKey.activeLoan,
    queryFn: async () => unwrapOptional(await creditRepository.getActiveLoan()),
  });
}

export function useLoanHistory() {
  const creditRepository = useResolve('creditRepository');

  return useQuery<LoanHistory | null>({
    queryKey: creditQueryKey.history,
    queryFn: async () => unwrapOptional(await creditRepository.getHistory()),
  });
}

export function useLoanMovements() {
  const creditRepository = useResolve('creditRepository');

  return useQuery<LoanMovement[]>({
    queryKey: creditQueryKey.movements,
    queryFn: async () => unwrap(await creditRepository.getMovements()),
  });
}

export function useLoanOffer() {
  const creditRepository = useResolve('creditRepository');

  return useQuery<LoanOffer | null>({
    queryKey: creditQueryKey.offer,
    queryFn: async () => unwrapOptional(await creditRepository.getOffer()),
  });
}

export function useLoanQuote(principalMinor: number) {
  const creditRepository = useResolve('creditRepository');

  return useQuery<LoanQuote>({
    queryKey: creditQueryKey.quote(principalMinor),
    queryFn: async () => unwrap(await creditRepository.quoteLoan(principalMinor)),
    enabled: principalMinor > 0,
  });
}

export function useTakeLoan() {
  const creditRepository = useResolve('creditRepository');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (principalMinor: number) =>
      unwrap(await creditRepository.takeLoan(principalMinor)),
    onSuccess: () => invalidateCredit(queryClient),
  });
}

export function useRepayLoan() {
  const creditRepository = useResolve('creditRepository');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amountMinor: number) => unwrap(await creditRepository.repay(amountMinor)),
    onSuccess: () => invalidateCredit(queryClient),
  });
}

export function useRepaymentBalance(tokenSymbol: string) {
  const tokenBalancePort = useResolve('tokenBalancePort');

  return useQuery({
    queryKey: ['credit', 'balance', tokenSymbol],
    queryFn: async () => unwrap(await tokenBalancePort.getBalance(tokenSymbol)) ?? null,
  });
}

function invalidateCredit(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: creditQueryKey.activeLoan }),
    queryClient.invalidateQueries({ queryKey: creditQueryKey.movements }),
    queryClient.invalidateQueries({ queryKey: creditQueryKey.history }),
    queryClient.invalidateQueries({ queryKey: creditQueryKey.score }),
  ]);
}
