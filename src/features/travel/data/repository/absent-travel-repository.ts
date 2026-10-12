import { err, ok } from '@/core/result/result';
import { unknownError } from '@/core/errors/app-error';
import type { EsimRepository } from '../../domain/repository/esim-repository';
import type { InsuranceRepository } from '../../domain/repository/insurance-repository';

export function createAbsentEsimRepository(): EsimRepository {
  const unavailable = () => Promise.resolve(err(unknownError()));

  return {
    getDestinations: () => Promise.resolve(ok([])),
    getPlans: () => Promise.resolve(ok([])),
    getInstalled: () => Promise.resolve(ok([])),
    purchase: unavailable,
    install: unavailable,
  };
}

export function createAbsentInsuranceRepository(): InsuranceRepository {
  const unavailable = () => Promise.resolve(err(unknownError()));

  return {
    getCovers: () => Promise.resolve(ok([])),
    getCoverage: () => Promise.resolve(ok([])),
    getPolicies: () => Promise.resolve(ok([])),
    buyPolicy: unavailable,
  };
}
