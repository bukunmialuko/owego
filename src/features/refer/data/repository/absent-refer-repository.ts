import { ok } from '@/core/result/result';
import type { ReferRepository } from '../../domain/repository/refer-repository';

export function createAbsentReferRepository(): ReferRepository {
  return {
    getSummary: () => Promise.resolve(ok(undefined)),
    getPayouts: () => Promise.resolve(ok([])),
    getReferrals: () => Promise.resolve(ok([])),
  };
}
