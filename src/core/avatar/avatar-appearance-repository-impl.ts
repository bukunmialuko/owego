import type { KeyValueStorage } from '@/core/storage/key-value-storage';
import { CacheKey } from '@/core/storage/storage-keys';
import { DEFAULT_AVATAR_APPEARANCE, type AvatarAppearanceRepository } from './avatar-appearance';
import { avatarAppearanceRecordSchema } from './avatar-appearance-model';

export function createAvatarAppearanceRepositoryImpl({
  cache,
}: {
  cache: KeyValueStorage;
}): AvatarAppearanceRepository {
  return {
    read(ownerId) {
      if (ownerId === undefined || ownerId === '') return DEFAULT_AVATAR_APPEARANCE;

      const stored = cache.getObject(CacheKey.AvatarPreferences, avatarAppearanceRecordSchema);
      if (!stored.ok || stored.value?.user_id !== ownerId) return DEFAULT_AVATAR_APPEARANCE;

      return stored.value.appearance;
    },

    write(ownerId, appearance) {
      cache.setObject(CacheKey.AvatarPreferences, { user_id: ownerId, appearance });
    },
  };
}
