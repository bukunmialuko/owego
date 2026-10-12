import { ok } from '@/core/result/result';
import type { VerificationRepository } from '../../domain/repository/home-repository';

export function createAbsentVerificationRepository(): VerificationRepository {
  return {
    getNotice: () => Promise.resolve(ok(undefined)),
    dismiss: () => Promise.resolve(ok(undefined)),
  };
}
