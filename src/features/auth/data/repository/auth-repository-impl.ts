import { countryNotSelected, type AppError } from '@/core/errors/app-error';
import type { TokenStore } from '@/core/network/auth-tokens';
import type { KeyValueStorage } from '@/core/storage/key-value-storage';
import { CacheKey } from '@/core/storage/storage-keys';
import { err, ok, type Result } from '@/core/result/result';
import type { OAuthCredential, Session } from '../../domain/entity/auth-entity';
import type { AuthRepository } from '../../domain/repository/auth-repository';
import { toSession } from '../mapper/auth-mapper';
import type { AuthRemoteDataSource } from '../datasource/auth-remote-datasource';
import { toCachedProfile } from '../model/auth-model';

type Dependencies = {
  remoteDataSource: AuthRemoteDataSource;
  tokenStore: TokenStore;
  cache: KeyValueStorage;
  resolveCountry: () => string | undefined;
};

export function createAuthRepositoryImpl({
  remoteDataSource,
  tokenStore,
  cache,
  resolveCountry,
}: Dependencies): AuthRepository {
  async function persist(dto: Parameters<typeof toSession>[0]): Promise<Session> {
    const session = toSession(dto);

    await tokenStore.write(session.tokens);
    cache.setObject(CacheKey.UserProfile, toCachedProfile(dto.user));

    return session;
  }

  async function exchange(
    call: () => Promise<Result<Parameters<typeof toSession>[0], AppError>>,
  ): Promise<Result<Session, AppError>> {
    const response = await call();
    if (!response.ok) return response;

    return ok(await persist(response.value));
  }

  async function signIn(
    call: (country: string) => Promise<Result<Parameters<typeof toSession>[0], AppError>>,
  ): Promise<Result<Session, AppError>> {
    const country = resolveCountry();
    if (country === undefined) return err(countryNotSelected());

    return exchange(() => call(country));
  }

  return {
    signInWithGoogle(credential: OAuthCredential) {
      return signIn((country) => remoteDataSource.exchangeGoogleToken(credential, country));
    },

    signInWithApple(credential: OAuthCredential) {
      return signIn((country) => remoteDataSource.exchangeAppleToken(credential, country));
    },

    signUpWithGoogle(credential: OAuthCredential, country: string) {
      return exchange(() => remoteDataSource.exchangeGoogleToken(credential, country));
    },

    signUpWithApple(credential: OAuthCredential, country: string) {
      return exchange(() => remoteDataSource.exchangeAppleToken(credential, country));
    },
  };
}
