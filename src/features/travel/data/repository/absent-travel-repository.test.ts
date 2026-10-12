import type { AppError } from '@/core/errors/app-error';
import { ErrorCategory, ErrorCode } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type { TripDetails } from '../../domain/entity/insurance-entity';
import {
  createAbsentEsimRepository,
  createAbsentInsuranceRepository,
} from './absent-travel-repository';

async function value<T>(promise: Promise<Result<T, AppError>>): Promise<T> {
  const result = await promise;
  if (!result.ok) throw new Error('expected an ok result');

  return result.value;
}

async function failure<T>(promise: Promise<Result<T, AppError>>): Promise<AppError> {
  const result = await promise;
  if (result.ok) throw new Error('expected an err result');

  return result.error;
}

const trip: TripDetails = {
  destinationCode: 'US',
  destinationName: 'United States',
  departure: '2026-10-01',
  returnDate: '2026-10-08',
  travellers: 2,
  tripCostMinor: 250_000,
  currency: 'USD',
};

describe('absent eSIM repository', () => {
  it('offers an empty catalogue rather than plans nobody can buy', async () => {
    const repository = createAbsentEsimRepository();

    expect(await value(repository.getDestinations())).toEqual([]);
    expect(await value(repository.getPlans('US'))).toEqual([]);
  });

  it('reports no eSIM installed', async () => {
    const repository = createAbsentEsimRepository();

    expect(await value(repository.getInstalled())).toEqual([]);
  });

  it('refuses to purchase a plan', async () => {
    const repository = createAbsentEsimRepository();

    const error = await failure(repository.purchase('plan-us-5gb'));

    expect(error.code).toBe(ErrorCode.Unknown);
    expect(error.category).toBe(ErrorCategory.Unknown);
    expect(error.titleKey).toBe('errors.common.unknown');
  });

  it('refuses to install an eSIM', async () => {
    const repository = createAbsentEsimRepository();

    const error = await failure(repository.install('esim-1'));

    expect(error.code).toBe(ErrorCode.Unknown);
    expect(error.category).toBe(ErrorCategory.Unknown);
    expect(error.retryable).toBe(false);
  });

  it('refuses as a resolved err arm rather than by throwing', async () => {
    const repository = createAbsentEsimRepository();

    await expect(repository.purchase('plan-us-5gb')).resolves.toMatchObject({ ok: false });
    await expect(repository.install('esim-1')).resolves.toMatchObject({ ok: false });
  });
});

describe('absent insurance repository', () => {
  it('quotes no covers and lists no coverage lines', async () => {
    const repository = createAbsentInsuranceRepository();

    expect(await value(repository.getCovers(trip))).toEqual([]);
    expect(await value(repository.getCoverage('deluxe'))).toEqual([]);
  });

  it('reports no policies held', async () => {
    const repository = createAbsentInsuranceRepository();

    expect(await value(repository.getPolicies())).toEqual([]);
  });

  it('refuses to buy a policy', async () => {
    const repository = createAbsentInsuranceRepository();

    const error = await failure(repository.buyPolicy(trip, 'platinum'));

    expect(error.code).toBe(ErrorCode.Unknown);
    expect(error.category).toBe(ErrorCategory.Unknown);
    expect(error.titleKey).toBe('errors.common.unknown');
    expect(error.retryable).toBe(false);
  });

  it('refuses as a resolved err arm rather than by throwing', async () => {
    const repository = createAbsentInsuranceRepository();

    await expect(repository.buyPolicy(trip, 'essential')).resolves.toMatchObject({ ok: false });
  });
});
