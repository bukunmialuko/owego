import type { AppError } from '@/core/errors/app-error';
import { ErrorCategory, ErrorCode } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import { createAbsentCreditRepository } from './absent-credit-repository';

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

describe('absent credit repository', () => {
  it('reports no score rather than inventing a number a person would act on', async () => {
    const repository = createAbsentCreditRepository();

    expect(await value(repository.getScore())).toBeUndefined();
  });

  it('reports no loan running, no history and no offer', async () => {
    const repository = createAbsentCreditRepository();

    expect(await value(repository.getActiveLoan())).toBeUndefined();
    expect(await value(repository.getHistory())).toBeUndefined();
    expect(await value(repository.getOffer())).toBeUndefined();
  });

  it('reports an empty ledger of movements', async () => {
    const repository = createAbsentCreditRepository();

    expect(await value(repository.getMovements())).toEqual([]);
  });

  it('refuses to quote a loan', async () => {
    const repository = createAbsentCreditRepository();

    const error = await failure(repository.quoteLoan(18_000));

    expect(error.code).toBe(ErrorCode.Unknown);
    expect(error.category).toBe(ErrorCategory.Unknown);
    expect(error.titleKey).toBe('errors.common.unknown');
  });

  it('refuses to take a loan', async () => {
    const repository = createAbsentCreditRepository();

    const error = await failure(repository.takeLoan(25_000));

    expect(error.code).toBe(ErrorCode.Unknown);
    expect(error.category).toBe(ErrorCategory.Unknown);
  });

  it('refuses to record a repayment', async () => {
    const repository = createAbsentCreditRepository();

    const error = await failure(repository.repay(1_000));

    expect(error.code).toBe(ErrorCode.Unknown);
    expect(error.category).toBe(ErrorCategory.Unknown);
  });

  it('refuses as a resolved err arm rather than by throwing', async () => {
    const repository = createAbsentCreditRepository();

    await expect(repository.quoteLoan(1)).resolves.toMatchObject({ ok: false });
    await expect(repository.takeLoan(1)).resolves.toMatchObject({ ok: false });
    await expect(repository.repay(1)).resolves.toMatchObject({ ok: false });
  });

  it('marks the refusal as not worth retrying', async () => {
    const repository = createAbsentCreditRepository();

    expect((await failure(repository.takeLoan(1_000))).retryable).toBe(false);
  });
});
