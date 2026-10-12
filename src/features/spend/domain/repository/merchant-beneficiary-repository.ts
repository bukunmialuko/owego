import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';

export type MerchantToSave = { qrString: string };

export interface MerchantBeneficiaryRepository {
  save(merchant: MerchantToSave): Promise<Result<void, AppError>>;
}
