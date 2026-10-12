import { ErrorCode, offline } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { AppError } from '@/core/errors/app-error';
import { BLANK_RECIPIENT_FIELDS, type RecipientFields } from '../entity/beneficiary';
import { PaymentMethodCode } from '../entity/beneficiary-form';
import { corridorFor, walletBeneficiaryCorridor } from '../corridor/registry';
import { recipientFor } from '../corridor/recipient-corridor';
import type { CorridorSpec, FieldValues } from '../corridor/corridor-spec';
import { toBeneficiary } from '../beneficiary/to-beneficiary';
import type { BeneficiaryRepository } from '../repository/beneficiary-repository';
import { createSaveBeneficiaryUseCase } from './save-beneficiary-usecase';

const labelOf = (name: string) => (name === 'bankCode' ? 'Guaranty Trust Bank' : '');

function corridor(currency: string, method: PaymentMethodCode): CorridorSpec {
  const found = corridorFor(currency, method);
  if (found === undefined) throw new Error(`no corridor ${currency}:${method}`);

  return found;
}

const ZELLE: FieldValues = {
  category: 'individual',
  beneficiaryName: 'Precious Jameson',
  zelleId: 'precious@mail.com',
};

function repository(created: Result<void, AppError> = ok(undefined)) {
  const saved: RecipientFields[] = [];
  const beneficiaryRepository: BeneficiaryRepository = {
    list: () => Promise.resolve(ok([])),
    getRecent: () => Promise.resolve(ok([])),
    get: () => Promise.resolve(err(offline())),
    create: (fields) => {
      saved.push(fields);

      return Promise.resolve(created);
    },
    remove: () => Promise.resolve(ok(undefined)),
  };

  return { saved, useCase: createSaveBeneficiaryUseCase({ beneficiaryRepository }) };
}

function existing(fields: Partial<RecipientFields>) {
  return toBeneficiary({
    id: 'existing',
    fields: { ...BLANK_RECIPIENT_FIELDS, ...fields },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  });
}

describe('saving a beneficiary', () => {
  it('saves a complete form as the record its corridor describes', async () => {
    const { saved, useCase } = repository();
    const zelle = corridor('USD', PaymentMethodCode.Zelle);

    const result = await useCase.execute({ corridor: zelle, values: ZELLE, labelOf, existing: [] });

    expect(result).toEqual(ok({ kind: 'saved' }));
    expect(saved).toEqual([recipientFor(zelle, ZELLE, labelOf)]);
  });

  it('refuses a corridor that cannot be saved', async () => {
    const { saved, useCase } = repository();

    const result = await useCase.execute({
      corridor: corridor('VND', PaymentMethodCode.Crypto),
      values: {},
      labelOf,
      existing: [],
    });

    expect(result.ok ? undefined : result.error.code).toBe(ErrorCode.InvalidInput);
    expect(saved).toEqual([]);
  });

  it('refuses a form with an answer missing', async () => {
    const { saved, useCase } = repository();

    const result = await useCase.execute({
      corridor: corridor('USD', PaymentMethodCode.Zelle),
      values: { ...ZELLE, zelleId: '' },
      labelOf,
      existing: [],
    });

    expect(result.ok).toBe(false);
    expect(saved).toEqual([]);
  });

  it('refuses a Nigerian account whose holder the server has not resolved', async () => {
    const { saved, useCase } = repository();

    const result = await useCase.execute({
      corridor: corridor('NGN', PaymentMethodCode.BankTransfer),
      values: { bankCode: '058', accountNumber: '0123456789' },
      labelOf,
      existing: [],
    });

    expect(result.ok).toBe(false);
    expect(saved).toEqual([]);
  });

  it('refuses a wallet address that belongs to another network, and says which field', async () => {
    const { saved, useCase } = repository();

    const result = await useCase.execute({
      corridor: walletBeneficiaryCorridor(),
      values: {
        walletTag: 'Main wallet',
        network: 'SOL',
        walletAddress: '0xb249111111111111111111111111111111113901',
      },
      labelOf,
      existing: [],
    });

    expect(result.ok ? undefined : result.error.fieldErrors).toEqual({
      walletAddress: 'spend.addressWrongNetwork',
    });
    expect(saved).toEqual([]);
  });

  it('points to the saved copy rather than saving the same destination twice', async () => {
    const { saved, useCase } = repository();
    const already = existing({
      bankCountry: 'us',
      bankName: 'Zelle',
      bankCode: 'individual',
      accountHolder: 'P. Jameson',
      accountNumber: 'precious@mail.com',
    });

    const result = await useCase.execute({
      corridor: corridor('USD', PaymentMethodCode.Zelle),
      values: ZELLE,
      labelOf,
      existing: [already],
    });

    expect(result).toEqual(ok({ kind: 'duplicate', existing: already }));
    expect(saved).toEqual([]);
  });

  it('saves a second account of someone already saved', async () => {
    const { saved, useCase } = repository();

    await useCase.execute({
      corridor: corridor('USD', PaymentMethodCode.Zelle),
      values: ZELLE,
      labelOf,
      existing: [
        existing({
          bankCountry: 'us',
          bankName: 'Zelle',
          bankCode: 'individual',
          accountHolder: 'Precious Jameson',
          accountNumber: '+15551234567',
        }),
      ],
    });

    expect(saved).toHaveLength(1);
  });

  it('passes a failed save through', async () => {
    const { useCase } = repository(err(offline()));

    const result = await useCase.execute({
      corridor: corridor('USD', PaymentMethodCode.Zelle),
      values: ZELLE,
      labelOf,
      existing: [],
    });

    expect(result).toEqual(err(offline()));
  });
});
