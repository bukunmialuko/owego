import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
  type NativeModuleError,
  type SignInResponse,
} from '@react-native-google-signin/google-signin';
import { ErrorCode } from '@/core/errors/app-error';
import { createGoogleAuthenticator } from './google-authenticator';

const config = {
  webClientId: 'web-client-id.apps.googleusercontent.com',
  iosClientId: 'ios-client-id.apps.googleusercontent.com',
};

function signedIn(idToken: string | null): SignInResponse {
  return {
    type: 'success',
    data: {
      user: {
        id: 'g1',
        name: 'Precious Jameson',
        email: 'p@example.com',
        photo: null,
        familyName: 'Jameson',
        givenName: 'Precious',
      },
      scopes: ['email', 'profile'],
      idToken,
      serverAuthCode: null,
    },
  };
}

function nativeError(code: string, message: string): NativeModuleError {
  return Object.assign(new Error(message), { code });
}

describe('createGoogleAuthenticator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isErrorWithCode).mockReturnValue(false);
  });

  it('returns the id token when the sheet completes', async () => {
    jest.mocked(GoogleSignin.signIn).mockResolvedValueOnce(signedIn('google-id-token'));

    const result = await createGoogleAuthenticator(config).authenticate();

    expect(result).toEqual({ ok: true, value: { idToken: 'google-id-token' } });
  });

  it('configures the sdk with the client ids it was given', async () => {
    await createGoogleAuthenticator(config).authenticate();

    expect(GoogleSignin.configure).toHaveBeenCalledWith({
      webClientId: 'web-client-id.apps.googleusercontent.com',
      iosClientId: 'ios-client-id.apps.googleusercontent.com',
    });
  });

  it('configures the sdk once however often the user signs in', async () => {
    const authenticator = createGoogleAuthenticator(config);

    await authenticator.authenticate();
    await authenticator.authenticate();

    expect(GoogleSignin.configure).toHaveBeenCalledTimes(1);
    expect(GoogleSignin.signIn).toHaveBeenCalledTimes(2);
  });

  it('checks play services before showing the sheet', async () => {
    const calls: string[] = [];
    jest.mocked(GoogleSignin.hasPlayServices).mockImplementationOnce(async () => {
      calls.push('play-services');
      return true;
    });
    jest.mocked(GoogleSignin.signIn).mockImplementationOnce(async () => {
      calls.push('sign-in');
      return signedIn('google-id-token');
    });

    await createGoogleAuthenticator(config).authenticate();

    expect(calls).toEqual(['play-services', 'sign-in']);
  });

  it('reports a dismissed sheet as a cancellation rather than a failure', async () => {
    jest.mocked(GoogleSignin.signIn).mockResolvedValueOnce({ type: 'cancelled', data: null });

    const result = await createGoogleAuthenticator(config).authenticate();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error.code).toBe(ErrorCode.SignInCancelled);
    expect(result.error.retryable).toBe(false);
  });

  it('reports the sdk cancellation code as a cancellation rather than a failure', async () => {
    jest.mocked(isErrorWithCode).mockReturnValue(true);
    jest
      .mocked(GoogleSignin.signIn)
      .mockRejectedValueOnce(nativeError(statusCodes.SIGN_IN_CANCELLED, 'user cancelled'));

    const result = await createGoogleAuthenticator(config).authenticate();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error.code).toBe(ErrorCode.SignInCancelled);
    expect(result.error.cause).toBeUndefined();
  });

  it('fails when google signs the user in without an id token', async () => {
    jest.mocked(GoogleSignin.signIn).mockResolvedValueOnce(signedIn(null));

    const result = await createGoogleAuthenticator(config).authenticate();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error.code).toBe(ErrorCode.Unknown);
    expect(result.error.detail).toBe('Google returned no id token. Check the web client id.');
  });

  it('fails when google returns a blank id token', async () => {
    jest.mocked(GoogleSignin.signIn).mockResolvedValueOnce(signedIn(''));

    const result = await createGoogleAuthenticator(config).authenticate();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error.code).toBe(ErrorCode.Unknown);
    expect(result.error.detail).toBe('Google returned no id token. Check the web client id.');
  });

  it('keeps the sdk status code in the diagnostics', async () => {
    const cause = nativeError('DEVELOPER_ERROR', 'client id mismatch');
    jest.mocked(isErrorWithCode).mockReturnValue(true);
    jest.mocked(GoogleSignin.signIn).mockRejectedValueOnce(cause);

    const result = await createGoogleAuthenticator(config).authenticate();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error.code).toBe(ErrorCode.Unknown);
    expect(result.error.detail).toBe('Google sign-in failed [DEVELOPER_ERROR]: client id mismatch');
    expect(result.error.cause).toBe(cause);
  });

  it('fails without showing the sheet when play services are unavailable', async () => {
    jest.mocked(isErrorWithCode).mockReturnValue(true);
    jest
      .mocked(GoogleSignin.hasPlayServices)
      .mockRejectedValueOnce(nativeError('PLAY_SERVICES_NOT_AVAILABLE', 'play services missing'));

    const result = await createGoogleAuthenticator(config).authenticate();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error.detail).toBe(
      'Google sign-in failed [PLAY_SERVICES_NOT_AVAILABLE]: play services missing',
    );
    expect(GoogleSignin.signIn).not.toHaveBeenCalled();
  });

  it('records that a failure carried no sdk code', async () => {
    const cause = new Error('network request failed');
    jest.mocked(GoogleSignin.signIn).mockRejectedValueOnce(cause);

    const result = await createGoogleAuthenticator(config).authenticate();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error.detail).toBe('Google sign-in failed [no-code]: network request failed');
    expect(result.error.cause).toBe(cause);
  });

  it('stringifies a rejection that is not an error', async () => {
    jest.mocked(GoogleSignin.signIn).mockRejectedValueOnce('the native module exploded');

    const result = await createGoogleAuthenticator(config).authenticate();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error.detail).toBe('Google sign-in failed [no-code]: the native module exploded');
  });
});
