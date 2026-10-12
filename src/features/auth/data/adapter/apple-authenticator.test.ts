import appleAuth, {
  type AppleRequestResponse,
  type AppleRequestResponseFullName,
} from '@invertase/react-native-apple-authentication';
import { ErrorCode } from '@/core/errors/app-error';
import { createAppleAuthenticator } from './apple-authenticator';

function appleResponse(overrides: Partial<AppleRequestResponse> = {}): AppleRequestResponse {
  return {
    nonce: 'nonce',
    user: 'apple-opaque-user-id',
    fullName: null,
    realUserStatus: appleAuth.UserStatus.LIKELY_REAL,
    authorizedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    identityToken: 'apple-identity-token',
    email: 'p@example.com',
    state: null,
    authorizationCode: 'authorization-code',
    ...overrides,
  };
}

function fullName(overrides: Partial<AppleRequestResponseFullName>): AppleRequestResponseFullName {
  return {
    namePrefix: null,
    givenName: null,
    middleName: null,
    familyName: null,
    nameSuffix: null,
    nickname: null,
    ...overrides,
  };
}

describe('createAppleAuthenticator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the identity token when the sheet completes', async () => {
    jest.mocked(appleAuth.performRequest).mockResolvedValueOnce(appleResponse());

    const result = await createAppleAuthenticator().authenticate();

    expect(result).toEqual({ ok: true, value: { idToken: 'apple-identity-token' } });
  });

  it('asks apple to log in with the email and name scopes', async () => {
    await createAppleAuthenticator().authenticate();

    expect(appleAuth.performRequest).toHaveBeenCalledWith({
      requestedOperation: 1,
      requestedScopes: [0, 1],
    });
  });

  it('captures the name apple sends on a first authorization', async () => {
    jest
      .mocked(appleAuth.performRequest)
      .mockResolvedValueOnce(
        appleResponse({ fullName: fullName({ givenName: 'Precious', familyName: 'Jameson' }) }),
      );

    const result = await createAppleAuthenticator().authenticate();

    expect(result).toEqual({
      ok: true,
      value: { idToken: 'apple-identity-token', givenName: 'Precious', familyName: 'Jameson' },
    });
  });

  it('keeps whichever half of the name apple sends', async () => {
    jest
      .mocked(appleAuth.performRequest)
      .mockResolvedValueOnce(appleResponse({ fullName: fullName({ givenName: 'Precious' }) }));

    const result = await createAppleAuthenticator().authenticate();

    expect(result).toEqual({
      ok: true,
      value: { idToken: 'apple-identity-token', givenName: 'Precious' },
    });
  });

  it('sends no name at all when apple withholds one', async () => {
    jest
      .mocked(appleAuth.performRequest)
      .mockResolvedValueOnce(appleResponse({ fullName: fullName({}) }));

    const result = await createAppleAuthenticator().authenticate();

    expect(result).toEqual({ ok: true, value: { idToken: 'apple-identity-token' } });
  });

  it('fails when apple authorizes without an identity token', async () => {
    jest
      .mocked(appleAuth.performRequest)
      .mockResolvedValueOnce(appleResponse({ identityToken: null }));

    const result = await createAppleAuthenticator().authenticate();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error.code).toBe(ErrorCode.Unknown);
    expect(result.error.detail).toBe('Apple returned no identity token.');
  });

  it('fails when apple returns a blank identity token', async () => {
    jest
      .mocked(appleAuth.performRequest)
      .mockResolvedValueOnce(appleResponse({ identityToken: '' }));

    const result = await createAppleAuthenticator().authenticate();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error.code).toBe(ErrorCode.Unknown);
    expect(result.error.detail).toBe('Apple returned no identity token.');
  });

  it('reports a dismissed sheet as a cancellation rather than a failure', async () => {
    const cause = Object.assign(new Error('The user canceled the authorization'), { code: '1001' });
    jest.mocked(appleAuth.performRequest).mockRejectedValueOnce(cause);

    const result = await createAppleAuthenticator().authenticate();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error.code).toBe(ErrorCode.SignInCancelled);
    expect(result.error.retryable).toBe(false);
  });

  it('treats any other apple error code as a failure', async () => {
    const cause = Object.assign(new Error('authorization failed'), { code: '1000' });
    jest.mocked(appleAuth.performRequest).mockRejectedValueOnce(cause);

    const result = await createAppleAuthenticator().authenticate();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error.code).toBe(ErrorCode.Unknown);
    expect(result.error.detail).toBe('Apple sign-in failed.');
    expect(result.error.cause).toBe(cause);
  });

  it('treats a rejection with no code as a failure', async () => {
    const cause = new Error('apple authentication is not supported on this device');
    jest.mocked(appleAuth.performRequest).mockRejectedValueOnce(cause);

    const result = await createAppleAuthenticator().authenticate();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error.code).toBe(ErrorCode.Unknown);
    expect(result.error.cause).toBe(cause);
  });

  it('treats a null rejection as a failure', async () => {
    jest.mocked(appleAuth.performRequest).mockRejectedValueOnce(null);

    const result = await createAppleAuthenticator().authenticate();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error.code).toBe(ErrorCode.Unknown);
    expect(result.error.detail).toBe('Apple sign-in failed.');
  });

  it('treats a rejection that is not an object as a failure', async () => {
    jest.mocked(appleAuth.performRequest).mockRejectedValueOnce('1001');

    const result = await createAppleAuthenticator().authenticate();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error.code).toBe(ErrorCode.Unknown);
  });
});
