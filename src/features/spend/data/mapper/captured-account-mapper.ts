import type { CapturedAccount } from '../../domain/entity/captured-account';
import type { CapturedAccountDto } from '../model/captured-account-model';

export function toCapturedAccount(dto: CapturedAccountDto): CapturedAccount {
  return {
    accountNumber: dto.account_number,
    bankName: dto.bank_name,
    bankCode: dto.bank_code,
    accountName: dto.account_name,
    isVerified: dto.is_verified,
  };
}
