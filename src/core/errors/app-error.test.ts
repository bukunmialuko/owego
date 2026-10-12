import { z } from 'zod';
import {
  forbidden,
  fromUnknown,
  fromZodError,
  isAppError,
  isServerRefusal,
  kycNotCompleted,
  offline,
  rateLimited,
  serverError,
  timeout,
  unauthenticated,
  unknownError,
  walletNotCreated,
  countryNotSelected,
  signInCancelled,
} from './app-error';
import { fromHttp } from './from-http';

describe('AppError', () => {
  it('identifies its own shape', () => {
    expect(isAppError(offline())).toBe(true);
    expect(isAppError(new Error('nope'))).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError({ code: 'x' })).toBe(false);
  });

  describe('transport failures', () => {
    it('marks network problems retryable', () => {
      expect(offline()).toMatchObject({
        code: 'network/offline',
        category: 'network',
        retryable: true,
      });
      expect(timeout()).toMatchObject({ code: 'network/timeout', retryable: true });
    });

    it('marks a server error retryable and carries its status', () => {
      expect(serverError(503)).toMatchObject({
        code: 'server/internal',
        category: 'server',
        httpStatus: 503,
        retryable: true,
      });
    });

    it('defaults a server error to 500', () => {
      expect(serverError().httpStatus).toBe(500);
    });

    it('marks rate limiting retryable and keeps the retry hint', () => {
      expect(rateLimited(30)).toMatchObject({
        code: 'common/rate-limited',
        httpStatus: 429,
        retryable: true,
        retryAfterSeconds: 30,
      });
    });
  });

  describe('auth failures', () => {
    it('is not retryable, because retrying cannot fix it', () => {
      expect(unauthenticated()).toMatchObject({
        code: 'auth/unauthenticated',
        category: 'auth',
        httpStatus: 401,
        retryable: false,
      });
      expect(forbidden()).toMatchObject({ code: 'auth/forbidden', httpStatus: 403 });
    });
  });

  describe('domain outcomes', () => {
    it('carries no http status', () => {
      expect(kycNotCompleted()).toMatchObject({
        code: 'auth/kyc-not-completed',
        category: 'domain',
        retryable: false,
      });
      expect(kycNotCompleted().httpStatus).toBeUndefined();
      expect(walletNotCreated()).toMatchObject({ code: 'wallet/not-created', category: 'domain' });
      expect(walletNotCreated().httpStatus).toBeUndefined();
    });
  });

  describe('titleKey', () => {
    it('is always a namespaced i18n key, never a display string', () => {
      const errors = [
        offline(),
        timeout(),
        serverError(),
        rateLimited(),
        unauthenticated(),
        forbidden(),
        kycNotCompleted(),
        walletNotCreated(),
        countryNotSelected(),
        signInCancelled(),
        unknownError(),
      ];

      for (const error of errors) {
        expect(error.titleKey).toMatch(/^errors\.[a-zA-Z.]+$/);
        expect(error.titleKey).not.toContain(' ');
      }
    });
  });

  describe('fromUnknown', () => {
    it('preserves an Error as cause and keeps its message for diagnostics only', () => {
      const cause = new Error('socket hang up');
      const error = fromUnknown(cause);

      expect(error).toMatchObject({
        code: 'common/unknown',
        category: 'unknown',
        detail: 'socket hang up',
      });
      expect(error.cause).toBe(cause);
    });

    it('handles a thrown non-Error', () => {
      expect(fromUnknown('just a string')).toMatchObject({
        code: 'common/unknown',
        detail: 'just a string',
      });
    });

    it('returns an AppError unchanged', () => {
      const existing = kycNotCompleted();
      expect(fromUnknown(existing)).toBe(existing);
    });
  });

  describe('isServerRefusal', () => {
    it.each([400, 422])('reads a %i as the server refusing the request', (status) => {
      expect(isServerRefusal(fromHttp({ status }))).toBe(true);
    });

    it('does not read a response the app could not parse as a refusal', () => {
      const parsed = z.object({ fee: z.number() }).safeParse({ fee: '0.25' });
      if (parsed.success) throw new Error('fixture should not parse');

      expect(isServerRefusal(fromZodError(parsed.error))).toBe(false);
    });

    it.each([
      ['a server error', fromHttp({ status: 500 })],
      ['a timeout', fromHttp({ isTimeout: true })],
    ])('does not read %s as a refusal', (_case, error) => {
      expect(isServerRefusal(error)).toBe(false);
    });
  });

  describe('fromZodError', () => {
    const schema = z.object({
      accountNumber: z.string().min(10),
      recipient: z.object({ email: z.email() }),
    });

    it('maps issues to field errors keyed by dotted path', () => {
      const parsed = schema.safeParse({ accountNumber: '123', recipient: { email: 'nope' } });
      if (parsed.success) throw new Error('fixture should not parse');

      const error = fromZodError(parsed.error);

      expect(error).toMatchObject({
        code: 'validation/invalid-input',
        category: 'validation',
        retryable: false,
      });
      expect(Object.keys(error.fieldErrors ?? {})).toEqual(
        expect.arrayContaining(['accountNumber', 'recipient.email']),
      );
    });
  });
});
