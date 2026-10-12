import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type {
  CoverOption,
  CoverTier,
  CoverageLine,
  Policy,
  TripDetails,
} from '../entity/insurance-entity';

export interface InsuranceRepository {
  getCovers(trip: TripDetails): Promise<Result<CoverOption[], AppError>>;
  getCoverage(tier: CoverTier): Promise<Result<CoverageLine[], AppError>>;
  buyPolicy(trip: TripDetails, tier: CoverTier): Promise<Result<Policy, AppError>>;
  getPolicies(): Promise<Result<Policy[], AppError>>;
}
