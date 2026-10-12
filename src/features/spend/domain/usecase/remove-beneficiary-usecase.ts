import { fromZodError, type AppError } from '@/core/errors/app-error';
import { err, type Result } from '@/core/result/result';
import type { BeneficiaryRepository } from '../repository/beneficiary-repository';
import { beneficiaryIdSchema } from './beneficiary-id';

type Dependencies = {
  beneficiaryRepository: BeneficiaryRepository;
};

export interface RemoveBeneficiaryUseCase {
  execute(id: string): Promise<Result<void, AppError>>;
}

export function createRemoveBeneficiaryUseCase({
  beneficiaryRepository,
}: Dependencies): RemoveBeneficiaryUseCase {
  return {
    async execute(id) {
      const parsed = beneficiaryIdSchema.safeParse(id);
      if (!parsed.success) return err(fromZodError(parsed.error));

      return beneficiaryRepository.remove(parsed.data);
    },
  };
}
