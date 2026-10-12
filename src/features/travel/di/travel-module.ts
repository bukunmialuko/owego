import { asFunction, type NameAndRegistrationPair } from 'awilix';
import type { AppCradle } from '@/core/di/container';
import {
  createAbsentEsimRepository,
  createAbsentInsuranceRepository,
} from '../data/repository/absent-travel-repository';
import type { EsimRepository } from '../domain/repository/esim-repository';
import type { InsuranceRepository } from '../domain/repository/insurance-repository';

declare module '@/core/di/container' {
  interface AppCradle {
    esimRepository: EsimRepository;
    insuranceRepository: InsuranceRepository;
  }
}

type Cradle = AppCradle;

export const travelRegistrations: NameAndRegistrationPair<Cradle> = {
  esimRepository: asFunction(() => createAbsentEsimRepository()).singleton(),
  insuranceRepository: asFunction(() => createAbsentInsuranceRepository()).singleton(),
};
