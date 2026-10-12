import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useResolve } from '@/core/di/container-provider';
import { AppErrorException } from '@/core/errors/app-error-exception';
import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type { EsimDestination, EsimPlan, InstalledEsim } from '../../domain/entity/esim-entity';
import type {
  CoverOption,
  CoverTier,
  CoverageLine,
  Policy,
  TripDetails,
} from '../../domain/entity/insurance-entity';

const travelQueryKey = {
  destinations: ['travel', 'destinations'] as const,
  plans: (code: string) => ['travel', 'plans', code] as const,
  installed: ['travel', 'installed'] as const,
  covers: (trip: TripDetails) => ['travel', 'covers', trip] as const,
  coverage: (tier: CoverTier) => ['travel', 'coverage', tier] as const,
  policies: ['travel', 'policies'] as const,
};

function unwrap<T>(result: Result<T, AppError>): T {
  if (!result.ok) throw new AppErrorException(result.error);

  return result.value;
}

export function useDestinations() {
  const esimRepository = useResolve('esimRepository');

  return useQuery<EsimDestination[]>({
    queryKey: travelQueryKey.destinations,
    queryFn: async () => unwrap(await esimRepository.getDestinations()),
  });
}

export function useEsimPlans(destinationCode: string) {
  const esimRepository = useResolve('esimRepository');

  return useQuery<EsimPlan[]>({
    queryKey: travelQueryKey.plans(destinationCode),
    queryFn: async () => unwrap(await esimRepository.getPlans(destinationCode)),
    enabled: destinationCode !== '',
  });
}

export function useInstalledEsims() {
  const esimRepository = useResolve('esimRepository');

  return useQuery<InstalledEsim[]>({
    queryKey: travelQueryKey.installed,
    queryFn: async () => unwrap(await esimRepository.getInstalled()),
  });
}

export function usePurchaseEsim() {
  const esimRepository = useResolve('esimRepository');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => unwrap(await esimRepository.purchase(planId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: travelQueryKey.installed }),
  });
}

export function useInstallEsim() {
  const esimRepository = useResolve('esimRepository');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (esimId: string) => unwrap(await esimRepository.install(esimId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: travelQueryKey.installed }),
  });
}

export function useCovers(trip: TripDetails) {
  const insuranceRepository = useResolve('insuranceRepository');

  return useQuery<CoverOption[]>({
    queryKey: travelQueryKey.covers(trip),
    queryFn: async () => unwrap(await insuranceRepository.getCovers(trip)),
  });
}

export function useCoverage(tier: CoverTier) {
  const insuranceRepository = useResolve('insuranceRepository');

  return useQuery<CoverageLine[]>({
    queryKey: travelQueryKey.coverage(tier),
    queryFn: async () => unwrap(await insuranceRepository.getCoverage(tier)),
  });
}

export function usePolicies() {
  const insuranceRepository = useResolve('insuranceRepository');

  return useQuery<Policy[]>({
    queryKey: travelQueryKey.policies,
    queryFn: async () => unwrap(await insuranceRepository.getPolicies()),
  });
}

export function useBuyPolicy() {
  const insuranceRepository = useResolve('insuranceRepository');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ trip, tier }: { trip: TripDetails; tier: CoverTier }) =>
      unwrap(await insuranceRepository.buyPolicy(trip, tier)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: travelQueryKey.policies }),
  });
}
