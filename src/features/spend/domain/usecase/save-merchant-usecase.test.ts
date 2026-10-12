import { offline } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { AppError } from '@/core/errors/app-error';
import { buildMerchantCode } from '@/test/qr-payloads';
import { toMerchantBeneficiary } from '../beneficiary/merchant-beneficiary';
import type {
  MerchantBeneficiaryRepository,
  MerchantToSave,
} from '../repository/merchant-beneficiary-repository';
import { createSaveMerchantUseCase } from './save-merchant-usecase';

const STICKER = buildMerchantCode({ merchantName: 'PHO 24' });

function repositoryAnswering(answer: Result<void, AppError>) {
  const saved: MerchantToSave[] = [];
  const merchantBeneficiaryRepository: MerchantBeneficiaryRepository = {
    save: (merchant) => {
      saved.push(merchant);
      return Promise.resolve(answer);
    },
  };

  return { saved, useCase: createSaveMerchantUseCase({ merchantBeneficiaryRepository }) };
}

describe('saving a merchant', () => {
  it('keeps the code verbatim', async () => {
    const { saved, useCase } = repositoryAnswering(ok(undefined));

    const result = await useCase.execute({ qrString: STICKER, existing: [] });

    expect(result).toEqual(ok({ kind: 'saved' }));
    expect(saved).toEqual([{ qrString: STICKER }]);
  });

  it('names the merchant already saved for this code, and keeps nothing', async () => {
    const already = toMerchantBeneficiary({
      id: 'm1',
      qrString: STICKER,
      createdAt: '',
      updatedAt: '',
    });
    const { saved, useCase } = repositoryAnswering(ok(undefined));

    const result = await useCase.execute({ qrString: STICKER, existing: [already] });

    expect(result).toEqual(ok({ kind: 'duplicate', existing: already }));
    expect(saved).toEqual([]);
  });

  it.each([
    [
      'a code generated for a single payment',
      buildMerchantCode({ amount: '1000', initiation: '12' }),
    ],
    ['something that is not a merchant code', '0123456789'],
  ])('keeps nothing for %s', async (_, qrString) => {
    const { saved, useCase } = repositoryAnswering(ok(undefined));

    expect(await useCase.execute({ qrString, existing: [] })).toEqual(ok({ kind: 'notSaveable' }));
    expect(saved).toEqual([]);
  });

  it('passes a failed save through', async () => {
    const { useCase } = repositoryAnswering(err(offline()));

    expect(await useCase.execute({ qrString: STICKER, existing: [] })).toEqual(err(offline()));
  });
});
