import appleAuth from '@invertase/react-native-apple-authentication';
import { signInCancelled, unknownError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { OAuthCredential } from '../../domain/entity/auth-entity';
import type { OAuthAuthenticator } from '../../domain/port/auth-port';

export function createAppleAuthenticator(): OAuthAuthenticator {
  return {
    async authenticate(): Promise<Result<OAuthCredential, AppError>> {
      try {
        const response = await appleAuth.performRequest({
          requestedOperation: appleAuth.Operation.LOGIN,
          requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
        });

        const idToken = response.identityToken;
        if (idToken === null || idToken === '') {
          return err(unknownError('Apple returned no identity token.'));
        }

        return ok({
          idToken,
          ...(response.fullName?.givenName == null
            ? {}
            : { givenName: response.fullName.givenName }),
          ...(response.fullName?.familyName == null
            ? {}
            : { familyName: response.fullName.familyName }),
        });
      } catch (cause) {
        if (isCancellation(cause)) {
          return err(signInCancelled());
        }

        return err(unknownError('Apple sign-in failed.', cause));
      }
    },
  };
}

function isCancellation(cause: unknown): boolean {
  return typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === '1001';
}
