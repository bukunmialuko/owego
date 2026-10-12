import { fromZodError, type AppError } from '@/core/errors/app-error';
import { err, type Result } from '@/core/result/result';
import type { Beneficiary } from '../entity/beneficiary';
import type { BeneficiaryRepository } from '../repository/beneficiary-repository';
import { beneficiaryIdSchema } from './beneficiary-id';

type Dependencies = {
  beneficiaryRepository: BeneficiaryRepository;
};

export interface GetBeneficiaryUseCase {
  execute(id: string): Promise<Result<Beneficiary, AppError>>;
}

export function createGetBeneficiaryUseCase({
  beneficiaryRepository,
}: Dependencies): GetBeneficiaryUseCase {
  return {
    async execute(id) {
      const parsed = beneficiaryIdSchema.safeParse(id);
      if (!parsed.success) return err(fromZodError(parsed.error));

      return beneficiaryRepository.get(parsed.data);
    },
  };
}
