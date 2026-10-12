import type { AppError } from '@/core/errors/app-error';
import { map, ok, type Result } from '@/core/result/result';
import { findSavedMerchant } from '../beneficiary/find-saved-copy';
import type { Beneficiary } from '../entity/beneficiary';
import type { MerchantBeneficiaryRepository } from '../repository/merchant-beneficiary-repository';
import { merchantCodeIn } from '../scan/merchant-code';

export type SaveMerchantInput = {
  qrString: string;
  existing: readonly Beneficiary[];
};

export type SaveMerchantOutcome =
  { kind: 'saved' } | { kind: 'duplicate'; existing: Beneficiary } | { kind: 'notSaveable' };

type Dependencies = { merchantBeneficiaryRepository: MerchantBeneficiaryRepository };

export interface SaveMerchantUseCase {
  execute(input: SaveMerchantInput): Promise<Result<SaveMerchantOutcome, AppError>>;
}

export function createSaveMerchantUseCase({
  merchantBeneficiaryRepository,
}: Dependencies): SaveMerchantUseCase {
  return {
    async execute({ qrString, existing }) {
      const code = merchantCodeIn(qrString);
      if (code === undefined || code.isOneTime) return ok({ kind: 'notSaveable' });

      const copy = findSavedMerchant(code.raw, existing);
      if (copy !== undefined) return ok({ kind: 'duplicate', existing: copy });

      const saved = await merchantBeneficiaryRepository.save({ qrString: code.raw });

      return map(saved, () => ({ kind: 'saved' }) as const);
    },
  };
}
