import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { signInCancelled, unknownError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { OAuthCredential } from '../../domain/entity/auth-entity';
import type { OAuthAuthenticator } from '../../domain/port/auth-port';

type Config = {
  webClientId: string;
  iosClientId: string;
};

export function createGoogleAuthenticator({
  webClientId,
  iosClientId,
}: Config): OAuthAuthenticator {
  let isConfigured = false;

  function configureOnce() {
    if (isConfigured) return;
    GoogleSignin.configure({ webClientId, iosClientId });
    isConfigured = true;
  }

  return {
    async authenticate(): Promise<Result<OAuthCredential, AppError>> {
      try {
        configureOnce();
        await GoogleSignin.hasPlayServices();

        const response = await GoogleSignin.signIn();

        if (response.type === 'cancelled') {
          return err(signInCancelled());
        }

        const idToken = response.data.idToken;
        if (idToken === null || idToken === undefined || idToken === '') {
          return err(unknownError('Google returned no id token. Check the web client id.'));
        }

        return ok({ idToken });
      } catch (cause) {
        if (isErrorWithCode(cause) && cause.code === statusCodes.SIGN_IN_CANCELLED) {
          return err(signInCancelled());
        }

        const code = isErrorWithCode(cause) ? cause.code : 'no-code';
        const message = cause instanceof Error ? cause.message : String(cause);

        return err(unknownError(`Google sign-in failed [${code}]: ${message}`, cause));
      }
    },
  };
}
