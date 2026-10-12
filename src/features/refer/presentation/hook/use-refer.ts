import { useQuery } from '@tanstack/react-query';
import { useResolve } from '@/core/di/container-provider';
import { AppErrorException } from '@/core/errors/app-error-exception';
import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type { Referral, ReferralPayout, ReferralSummary } from '../../domain/entity/refer-entity';

function unwrap<T>(result: Result<T, AppError>): T {
  if (!result.ok) throw new AppErrorException(result.error);

  return result.value;
}

function unwrapOptional<T>(result: Result<T | undefined, AppError>): T | null {
  if (!result.ok) throw new AppErrorException(result.error);

  return result.value ?? null;
}

export function useReferralSummary() {
  const referRepository = useResolve('referRepository');

  return useQuery<ReferralSummary | null>({
    queryKey: ['refer', 'summary'],
    queryFn: async () => unwrapOptional(await referRepository.getSummary()),
  });
}

export function useReferralPayouts() {
  const referRepository = useResolve('referRepository');

  return useQuery<ReferralPayout[]>({
    queryKey: ['refer', 'payouts'],
    queryFn: async () => unwrap(await referRepository.getPayouts()),
  });
}

export function useReferrals() {
  const referRepository = useResolve('referRepository');

  return useQuery<Referral[]>({
    queryKey: ['refer', 'referrals'],
    queryFn: async () => unwrap(await referRepository.getReferrals()),
  });
}
