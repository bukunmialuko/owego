import { fromZodError, type AppError } from '@/core/errors/app-error';
import type { HttpClient } from '@/core/network/http-client';
import { andThen, err, ok, type Result } from '@/core/result/result';
import type { OAuthCredential } from '../../domain/entity/auth-entity';
import { authResponseSchema, type AuthDto } from '../model/auth-model';

export interface AuthRemoteDataSource {
  exchangeGoogleToken(
    credential: OAuthCredential,
    country: string,
  ): Promise<Result<AuthDto, AppError>>;
  exchangeAppleToken(
    credential: OAuthCredential,
    country: string,
  ): Promise<Result<AuthDto, AppError>>;
}

export function createAuthRemoteDataSource(publicApiClient: HttpClient): AuthRemoteDataSource {
  async function exchange(path: string, body: unknown): Promise<Result<AuthDto, AppError>> {
    const response = await publicApiClient.post<unknown>(path, body);

    return andThen(response, parseAuthResponse);
  }

  const forWire = (country: string) => country.toUpperCase();

  return {
    exchangeGoogleToken(credential, country) {
      return exchange('/auth/google', { token: credential.idToken, country: forWire(country) });
    },

    exchangeAppleToken(credential, country) {
      return exchange('/auth/apple', {
        token: credential.idToken,
        country: forWire(country),
        given_name: credential.givenName ?? '',
        family_name: credential.familyName ?? '',
      });
    },
  };
}

function parseAuthResponse(payload: unknown): Result<AuthDto, AppError> {
  const parsed = authResponseSchema.safeParse(payload);

  return parsed.success ? ok(parsed.data.data) : err(fromZodError(parsed.error));
}
