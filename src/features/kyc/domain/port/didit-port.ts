import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type { VerificationOutcome } from '../entity/kyc-entity';

export interface DiditPort {
  verify(sessionToken: string): Promise<Result<VerificationOutcome, AppError>>;
}

export interface KycProfilePort {
  reloadKycState(): Promise<Result<string, AppError>>;
}
