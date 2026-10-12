import { createKeyValueStorage } from '@/core/storage/mmkv-key-value-storage';
import { CacheKey, CLEARED_ON_SIGN_OUT } from '@/core/storage/storage-keys';
import type { AvatarAppearance } from './avatar-appearance';
import { createAvatarAppearanceRepositoryImpl } from './avatar-appearance-repository-impl';

const CORAL: AvatarAppearance = { kind: 'initials', swatch: 'coral' };
const DEFAULT: AvatarAppearance = { kind: 'default' };

function setup() {
  const cache = createKeyValueStorage('avatar-appearance-test');

  return { cache, repository: createAvatarAppearanceRepositoryImpl({ cache }) };
}

describe('avatar appearance repository', () => {
  it('reads the default look when nothing is stored', () => {
    expect(setup().repository.read('u1')).toEqual(DEFAULT);
  });

  it('returns the look this account saved', () => {
    const { repository } = setup();

    repository.write('u1', CORAL);

    expect(repository.read('u1')).toEqual(CORAL);
  });

  it('ignores a look another account left behind', () => {
    const { repository } = setup();

    repository.write('u1', CORAL);

    expect(repository.read('u2')).toEqual(DEFAULT);
  });

  it('ignores a record with no owner', () => {
    const { cache, repository } = setup();

    cache.setObject(CacheKey.AvatarPreferences, { appearance: CORAL });

    expect(repository.read('')).toEqual(DEFAULT);
    expect(repository.read(undefined)).toEqual(DEFAULT);
  });

  it('treats a corrupted entry as the default', () => {
    const { cache, repository } = setup();

    cache.setString(CacheKey.AvatarPreferences, '{"user_id":"u1","appearance":');

    expect(repository.read('u1')).toEqual(DEFAULT);
  });

  it('keeps the look in an entry sign-out clears', () => {
    const { cache, repository } = setup();

    repository.write('u1', CORAL);

    expect(cache.getString(CacheKey.AvatarPreferences)).toBeDefined();
    expect(CLEARED_ON_SIGN_OUT).toContain(CacheKey.AvatarPreferences);
  });
});
