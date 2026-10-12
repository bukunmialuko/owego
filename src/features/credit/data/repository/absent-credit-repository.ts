import { err, ok } from '@/core/result/result';
import { unknownError } from '@/core/errors/app-error';
import type { CreditRepository } from '../../domain/repository/credit-repository';

export function createAbsentCreditRepository(): CreditRepository {
  const unavailable = () => Promise.resolve(err(unknownError()));

  return {
    getScore: () => Promise.resolve(ok(undefined)),
    getActiveLoan: () => Promise.resolve(ok(undefined)),
    getHistory: () => Promise.resolve(ok(undefined)),
    getMovements: () => Promise.resolve(ok([])),
    getOffer: () => Promise.resolve(ok(undefined)),
    quoteLoan: unavailable,
    takeLoan: unavailable,
    repay: unavailable,
  };
}
