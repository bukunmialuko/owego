import { ErrorCode, offline } from '@/core/errors/app-error';
import { createKeyValueStorage } from '@/core/storage/mmkv-key-value-storage';
import { CacheKey } from '@/core/storage/storage-keys';
import { err, ok } from '@/core/result/result';
import { createFakeTokenStore } from '@/test/fake-token-store';
import { createAuthRepositoryImpl } from './auth-repository-impl';
import { authSchema, userProfileSchema } from '../model/auth-model';
import type { AuthRemoteDataSource } from '../datasource/auth-remote-datasource';

const authDto = authSchema.parse({
  token: 'access-1',
  refresh_token: 'refresh-1',
  user: {
    id: 'u1',
    firstname: 'Precious',
    lastname: 'Jameson',
    country: 'ng',
    email: 'precious@example.com',
    number: '+2348000000000',
    google_id: 'google-123',
    apple_id: 'apple-123',
    bani_customer_ref: 'bani-123',
  },
  verification_status: { kyc_verified: true, is_pin_set: false },
});

function build(
  remote: Partial<AuthRemoteDataSource> = {},
  resolveCountry: () => string | undefined = () => 'ng',
) {
  const cache = createKeyValueStorage('auth-test');
  cache.clearAll();

  const tokenStore = createFakeTokenStore();
  const remoteDataSource = {
    exchangeGoogleToken: jest.fn().mockResolvedValue(ok(authDto)),
    exchangeAppleToken: jest.fn().mockResolvedValue(ok(authDto)),
    ...remote,
  } satisfies AuthRemoteDataSource;

  return {
    repository: createAuthRepositoryImpl({
      remoteDataSource,
      tokenStore,
      cache,
      resolveCountry,
    }),
    tokenStore,
    cache,
    remoteDataSource,
  };
}

describe('AuthRepository', () => {
  it('maps the wire payload onto the domain session', async () => {
    const { repository } = build();

    const result = await repository.signInWithGoogle({ idToken: 'id' });

    expect(result).toEqual(
      ok({
        user: expect.objectContaining({ id: 'u1', firstName: 'Precious', lastName: 'Jameson' }),
        tokens: { access: 'access-1', refresh: 'refresh-1' },
        verification: { kycVerified: true, isPinSet: false },
      }),
    );
  });

  it('persists the tokens so the http client can authenticate the next call', async () => {
    const { repository, tokenStore } = build();

    await repository.signInWithGoogle({ idToken: 'id' });

    expect(tokenStore.current).toEqual({ access: 'access-1', refresh: 'refresh-1' });
  });

  it('caches the profile for the next launch', async () => {
    const { repository, cache } = build();

    await repository.signInWithGoogle({ idToken: 'id' });

    const cached = cache.getObject(CacheKey.UserProfile, userProfileSchema);
    expect(cached.ok && cached.value?.country).toBe('ng');
  });

  it('sends the resolved country when signing in', async () => {
    const { repository, remoteDataSource } = build({}, () => 'ke');

    await repository.signInWithGoogle({ idToken: 'id' });

    expect(remoteDataSource.exchangeGoogleToken).toHaveBeenCalledWith({ idToken: 'id' }, 'ke');
  });

  it('sends the resolved country when signing in with apple', async () => {
    const { repository, remoteDataSource } = build({}, () => 'ke');

    await repository.signInWithApple({ idToken: 'id' });

    expect(remoteDataSource.exchangeAppleToken).toHaveBeenCalledWith({ idToken: 'id' }, 'ke');
  });

  describe('when no country resolves', () => {
    it('refuses to sign in rather than sending an empty country', async () => {
      const { repository, remoteDataSource } = build({}, () => undefined);

      const result = await repository.signInWithGoogle({ idToken: 'id' });

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected failure');
      expect(result.error.code).toBe(ErrorCode.CountryNotSelected);
      expect(remoteDataSource.exchangeGoogleToken).not.toHaveBeenCalled();
    });

    it('refuses to sign in with apple too', async () => {
      const { repository, remoteDataSource } = build({}, () => undefined);

      const result = await repository.signInWithApple({ idToken: 'id' });

      expect(result.ok).toBe(false);
      expect(remoteDataSource.exchangeAppleToken).not.toHaveBeenCalled();
    });

    it('persists nothing', async () => {
      const { repository, tokenStore, cache } = build({}, () => undefined);

      await repository.signInWithGoogle({ idToken: 'id' });

      expect(tokenStore.current).toBeUndefined();
      expect(cache.getString(CacheKey.UserProfile)).toBeUndefined();
    });

    it('does not affect sign-up, which brings its own country', async () => {
      const { repository, remoteDataSource } = build({}, () => undefined);

      await repository.signUpWithGoogle({ idToken: 'id' }, 'ng');

      expect(remoteDataSource.exchangeGoogleToken).toHaveBeenCalledWith({ idToken: 'id' }, 'ng');
    });
  });

  it('sends the chosen country when signing up', async () => {
    const { repository, remoteDataSource } = build();

    await repository.signUpWithGoogle({ idToken: 'id' }, 'ng');

    expect(remoteDataSource.exchangeGoogleToken).toHaveBeenCalledWith({ idToken: 'id' }, 'ng');
  });

  it('forwards the apple name fields, which the sdk only returns once', async () => {
    const { repository, remoteDataSource } = build();

    await repository.signUpWithApple(
      { idToken: 'id', givenName: 'Precious', familyName: 'Jameson' },
      'ng',
    );

    expect(remoteDataSource.exchangeAppleToken).toHaveBeenCalledWith(
      expect.objectContaining({ givenName: 'Precious', familyName: 'Jameson' }),
      'ng',
    );
  });

  it('writes nothing when the exchange fails', async () => {
    const { repository, tokenStore, cache } = build({
      exchangeGoogleToken: jest.fn().mockResolvedValue(err(offline())),
    });

    const result = await repository.signInWithGoogle({ idToken: 'id' });

    expect(result).toEqual(err(offline()));
    expect(tokenStore.current).toBeUndefined();
    expect(cache.getString(CacheKey.UserProfile)).toBeUndefined();
  });
});

describe('what reaches the profile cache', () => {
  it('keeps only the display and routing fields', async () => {
    const { repository, cache } = build();

    await repository.signInWithGoogle({ idToken: 'id' });

    const raw = cache.getString(CacheKey.UserProfile) ?? '';
    expect(Object.keys(JSON.parse(raw) as object).sort()).toEqual([
      'country',
      'firstname',
      'id',
      'kyc_state',
      'picture_url',
    ]);
  });

  it.each(['number', 'email', 'google_id', 'apple_id', 'bani_customer_ref', 'lastname'])(
    'never caches %s',
    async (field) => {
      const { repository, cache } = build();

      await repository.signInWithGoogle({ idToken: 'id' });

      expect(cache.getString(CacheKey.UserProfile) ?? '').not.toContain(field);
    },
  );
});
