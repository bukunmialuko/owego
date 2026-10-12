import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useResolve } from '@/core/di/container-provider';
import { AppErrorException } from '@/core/errors/app-error-exception';
import type { AppError } from '@/core/errors/app-error';
import { PAYEE_QUERY_ROOT } from '@/core/payee/payee';
import type { Result } from '@/core/result/result';
import type { Beneficiary } from '../../domain/entity/beneficiary';
import type {
  SaveMerchantInput,
  SaveMerchantOutcome,
} from '../../domain/usecase/save-merchant-usecase';
import type {
  SaveBeneficiaryInput,
  SaveBeneficiaryOutcome,
} from '../../domain/usecase/save-beneficiary-usecase';

const beneficiaryQueryKey = {
  directory: [...PAYEE_QUERY_ROOT, 'directory'] as const,
  recent: [...PAYEE_QUERY_ROOT, 'recent'] as const,
  detail: (id: string) => [...PAYEE_QUERY_ROOT, 'detail', id] as const,
};

const DIRECTORY_STALE_MS = 10 * 60 * 1000;

function unwrap<T>(result: Result<T, AppError>): T {
  if (!result.ok) throw new AppErrorException(result.error);

  return result.value;
}

type QueryOptions = { enabled?: boolean };

export function useBeneficiaryDirectory({ enabled = true }: QueryOptions = {}) {
  const beneficiaryRepository = useResolve('beneficiaryRepository');

  return useQuery<Beneficiary[]>({
    queryKey: beneficiaryQueryKey.directory,
    queryFn: async () => unwrap(await beneficiaryRepository.list()),
    staleTime: DIRECTORY_STALE_MS,
    enabled,
  });
}

export function useRecentBeneficiaries({ enabled = true }: QueryOptions = {}) {
  const beneficiaryRepository = useResolve('beneficiaryRepository');

  return useQuery<Beneficiary[]>({
    queryKey: beneficiaryQueryKey.recent,
    queryFn: async () => unwrap(await beneficiaryRepository.getRecent()),
    enabled,
  });
}

export function useBeneficiary(id: string) {
  const getBeneficiaryUseCase = useResolve('getBeneficiaryUseCase');
  const queryClient = useQueryClient();

  return useQuery<Beneficiary>({
    queryKey: beneficiaryQueryKey.detail(id),
    queryFn: async () => unwrap(await getBeneficiaryUseCase.execute(id)),
    placeholderData: () =>
      queryClient
        .getQueryData<Beneficiary[]>(beneficiaryQueryKey.directory)
        ?.find((beneficiary) => beneficiary.id === id),
  });
}

export function useSaveBeneficiary() {
  const saveBeneficiaryUseCase = useResolve('saveBeneficiaryUseCase');
  const queryClient = useQueryClient();

  return useMutation<SaveBeneficiaryOutcome, Error, SaveBeneficiaryInput>({
    mutationFn: async (input) => unwrap(await saveBeneficiaryUseCase.execute(input)),
    onSuccess: async (outcome) => {
      if (outcome.kind === 'saved')
        await queryClient.invalidateQueries({ queryKey: PAYEE_QUERY_ROOT });
    },
  });
}

export function useSaveMerchant() {
  const saveMerchantUseCase = useResolve('saveMerchantUseCase');
  const queryClient = useQueryClient();

  return useMutation<SaveMerchantOutcome, Error, SaveMerchantInput>({
    mutationFn: async (input) => unwrap(await saveMerchantUseCase.execute(input)),
    onSuccess: async (outcome) => {
      if (outcome.kind === 'saved')
        await queryClient.invalidateQueries({ queryKey: PAYEE_QUERY_ROOT });
    },
  });
}

export function useRemoveBeneficiary() {
  const removeBeneficiaryUseCase = useResolve('removeBeneficiaryUseCase');
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => unwrap(await removeBeneficiaryUseCase.execute(id)),
    onSuccess: (_nothing, id) => {
      queryClient.setQueryData<Beneficiary[]>(beneficiaryQueryKey.directory, (previous) =>
        previous?.filter((beneficiary) => beneficiary.id !== id),
      );

      void queryClient.invalidateQueries({
        queryKey: PAYEE_QUERY_ROOT,
        predicate: (query) => query.queryKey[1] !== 'detail',
      });
    },
  });
}
