import { map, ok, type Result } from '@/core/result/result';
import type { AppError } from '@/core/errors/app-error';
import type { UserProfile } from '../../domain/entity/auth-entity';
import type { ProfileRepository } from '../../domain/repository/auth-repository';

type SettingsProfileShape = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  kycState: string;
  pictureUrl: string;
};

type ProfileSnapshot = {
  id: string;
  email: string;
  kycState: string;
  firstName: string;
  country: string;
};

export function createProfileAdapter(profileRepository: ProfileRepository) {
  return {
    reloadKycState(): Promise<Result<string, AppError>> {
      return profileRepository
        .getProfile()
        .then((result) => map(result, (profile) => profile.kycState));
    },

    loadProfile(): Promise<Result<ProfileSnapshot, AppError>> {
      return profileRepository.getProfile().then((result) => map(result, toSnapshot));
    },

    loadSettingsProfile(): Promise<Result<SettingsProfileShape, AppError>> {
      return profileRepository.getProfile().then((result) => map(result, toSettingsProfile));
    },

    cachedProfile(): Result<ProfileSnapshot | undefined, AppError> {
      const cached = profileRepository.cachedProfile();

      return ok(cached === undefined ? undefined : toSnapshot(cached));
    },
  };
}

function toSettingsProfile(profile: UserProfile): SettingsProfileShape {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    phone: profile.phone,
    country: profile.country,
    kycState: profile.kycState,
    pictureUrl: profile.pictureUrl,
  };
}

function toSnapshot(profile: UserProfile): ProfileSnapshot {
  return {
    id: profile.id,
    email: profile.email,
    kycState: profile.kycState,
    firstName: profile.firstName,
    country: profile.country,
  };
}
