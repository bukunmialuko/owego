import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type { EsimDestination, EsimPlan, InstalledEsim } from '../entity/esim-entity';

export interface EsimRepository {
  getDestinations(): Promise<Result<EsimDestination[], AppError>>;
  getPlans(destinationCode: string): Promise<Result<EsimPlan[], AppError>>;
  purchase(planId: string): Promise<Result<InstalledEsim, AppError>>;
  getInstalled(): Promise<Result<InstalledEsim[], AppError>>;
  install(esimId: string): Promise<Result<InstalledEsim, AppError>>;
}
