import { map } from '@/core/result/result';
import type { KeyValueStorage } from '@/core/storage/key-value-storage';
import { CacheKey } from '@/core/storage/storage-keys';
import type { UserProfile } from '../../domain/entity/auth-entity';
import type { ProfileRepository } from '../../domain/repository/auth-repository';
import type { ProfileRemoteDataSource } from '../datasource/profile-remote-datasource';
import { toUserProfile } from '../mapper/auth-mapper';
import { cachedProfileSchema, toCachedProfile } from '../model/auth-model';

type Dependencies = {
  remoteDataSource: ProfileRemoteDataSource;
  cache: KeyValueStorage;
};

export function createProfileRepositoryImpl({
  remoteDataSource,
  cache,
}: Dependencies): ProfileRepository {
  return {
    async getProfile() {
      const response = await remoteDataSource.getProfile();

      if (response.ok) cache.setObject(CacheKey.UserProfile, toCachedProfile(response.value));

      return map(response, toUserProfile);
    },

    cachedProfile(): UserProfile | undefined {
      const cached = cache.getObject(CacheKey.UserProfile, cachedProfileSchema);
      if (!cached.ok || cached.value === undefined) return undefined;

      const profile = toUserProfile({
        ...cached.value,
        lastname: '',
        email: '',
        number: '',
        is_business: false,
        business_name: '',
        google_id: '',
        apple_id: '',
        bani_customer_ref: '',
        auth_provider: '',
      });

      return profile.id === '' ? undefined : profile;
    },
  };
}
