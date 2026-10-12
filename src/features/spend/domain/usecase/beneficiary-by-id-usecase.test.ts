import { ErrorCode, offline } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import { BLANK_RECIPIENT_FIELDS } from '../entity/beneficiary';
import { toBeneficiary } from '../beneficiary/to-beneficiary';
import type { BeneficiaryRepository } from '../repository/beneficiary-repository';
import { createGetBeneficiaryUseCase } from './get-beneficiary-usecase';
import { createRemoveBeneficiaryUseCase } from './remove-beneficiary-usecase';

const ID = '00000000-0000-4000-8000-00000000000a';

const SAVED = toBeneficiary({
  id: ID,
  fields: { ...BLANK_RECIPIENT_FIELDS, bankCountry: 'ng', accountNumber: '0123456789' },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

function fakeRepository(overrides: Partial<BeneficiaryRepository> = {}) {
  const calls: string[] = [];
  const beneficiaryRepository: BeneficiaryRepository = {
    list: () => Promise.resolve(ok([])),
    getRecent: () => Promise.resolve(ok([])),
    get: (id) => {
      calls.push(`get ${id}`);

      return Promise.resolve(ok(SAVED));
    },
    create: () => Promise.resolve(ok(undefined)),
    remove: (id) => {
      calls.push(`remove ${id}`);

      return Promise.resolve(ok(undefined));
    },
    ...overrides,
  };

  return { calls, beneficiaryRepository };
}

const HOSTILE_IDS = ['', '../user/me', 'a/b', 'a?b=1', 'a b', 'x'.repeat(129)];

describe('getBeneficiary', () => {
  it('reads the beneficiary fresh by its id', async () => {
    const { calls, beneficiaryRepository } = fakeRepository();

    const result = await createGetBeneficiaryUseCase({ beneficiaryRepository }).execute(ID);

    expect(result).toEqual(ok(SAVED));
    expect(calls).toEqual([`get ${ID}`]);
  });

  it.each(HOSTILE_IDS)('refuses %j before asking anyone', async (id) => {
    const { calls, beneficiaryRepository } = fakeRepository();

    const result = await createGetBeneficiaryUseCase({ beneficiaryRepository }).execute(id);

    expect(result.ok ? undefined : result.error.code).toBe(ErrorCode.InvalidInput);
    expect(calls).toEqual([]);
  });

  it('passes a failed read through', async () => {
    const { beneficiaryRepository } = fakeRepository({
      get: () => Promise.resolve(err(offline())),
    });

    expect(await createGetBeneficiaryUseCase({ beneficiaryRepository }).execute(ID)).toEqual(
      err(offline()),
    );
  });
});

describe('removeBeneficiary', () => {
  it('removes the beneficiary by its id', async () => {
    const { calls, beneficiaryRepository } = fakeRepository();

    const result = await createRemoveBeneficiaryUseCase({ beneficiaryRepository }).execute(ID);

    expect(result).toEqual(ok(undefined));
    expect(calls).toEqual([`remove ${ID}`]);
  });

  it.each(HOSTILE_IDS)('refuses %j before asking anyone', async (id) => {
    const { calls, beneficiaryRepository } = fakeRepository();

    const result = await createRemoveBeneficiaryUseCase({ beneficiaryRepository }).execute(id);

    expect(result.ok ? undefined : result.error.code).toBe(ErrorCode.InvalidInput);
    expect(calls).toEqual([]);
  });

  it('passes a failed removal through', async () => {
    const { beneficiaryRepository } = fakeRepository({
      remove: () => Promise.resolve(err(offline())),
    });

    expect(await createRemoveBeneficiaryUseCase({ beneficiaryRepository }).execute(ID)).toEqual(
      err(offline()),
    );
  });
});
