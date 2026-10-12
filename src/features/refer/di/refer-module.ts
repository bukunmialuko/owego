import { asFunction, type NameAndRegistrationPair } from 'awilix';
import type { AppCradle } from '@/core/di/container';
import { createAbsentReferRepository } from '../data/repository/absent-refer-repository';
import type { ReferRepository } from '../domain/repository/refer-repository';

declare module '@/core/di/container' {
  interface AppCradle {
    referRepository: ReferRepository;
  }
}

type Cradle = AppCradle;

export const referRegistrations: NameAndRegistrationPair<Cradle> = {
  referRepository: asFunction(() => createAbsentReferRepository()).singleton(),
};
