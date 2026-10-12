import { asFunction, type NameAndRegistrationPair } from 'awilix';
import type { AppCradle } from '@/core/di/container';
import { createAbsentCreditRepository } from '../data/repository/absent-credit-repository';
import type { CreditRepository } from '../domain/repository/credit-repository';

declare module '@/core/di/container' {
  interface AppCradle {
    creditRepository: CreditRepository;
  }
}

type Cradle = AppCradle;

export const creditRegistrations: NameAndRegistrationPair<Cradle> = {
  creditRepository: asFunction(() => createAbsentCreditRepository()).singleton(),
};
