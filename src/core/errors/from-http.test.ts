import { fromHttp } from './from-http';

describe('fromHttp', () => {
  describe('status mapping', () => {
    it('maps 401 to unauthenticated', () => {
      expect(fromHttp({ status: 401 })).toMatchObject({
        code: 'auth/unauthenticated',
        retryable: false,
      });
    });

    it('maps 403 to forbidden', () => {
      expect(fromHttp({ status: 403 })).toMatchObject({ code: 'auth/forbidden' });
    });

    it('maps 5xx to a retryable server error', () => {
      expect(fromHttp({ status: 503 })).toMatchObject({
        code: 'server/internal',
        httpStatus: 503,
        retryable: true,
      });
    });

    it('maps 422 to a validation failure', () => {
      expect(fromHttp({ status: 422 })).toMatchObject({
        code: 'validation/invalid-input',
        retryable: false,
      });
    });

    it('falls back to unknown for an unmapped status', () => {
      expect(fromHttp({ status: 418 })).toMatchObject({ code: 'common/unknown' });
    });
  });

  describe('rate limiting', () => {
    it('maps 429 to a retryable error', () => {
      expect(fromHttp({ status: 429 })).toMatchObject({
        code: 'common/rate-limited',
        retryable: true,
      });
    });

    it('reads Retry-After when present', () => {
      expect(fromHttp({ status: 429, headers: { 'retry-after': '30' } })).toMatchObject({
        retryAfterSeconds: 30,
      });
    });

    it('ignores a non-numeric Retry-After', () => {
      expect(
        fromHttp({ status: 429, headers: { 'retry-after': 'Wed, 21 Oct 2026 07:28:00 GMT' } })
          .retryAfterSeconds,
      ).toBeUndefined();
    });
  });

  describe('transport failures', () => {
    it('maps a timeout', () => {
      expect(fromHttp({ isTimeout: true })).toMatchObject({
        code: 'network/timeout',
        retryable: true,
      });
    });

    it('maps a missing response to offline', () => {
      expect(fromHttp({})).toMatchObject({ code: 'network/offline', retryable: true });
    });
  });

  describe('server message extraction', () => {
    it('reads the errors[].detail envelope', () => {
      const error = fromHttp({ status: 400, data: { errors: [{ detail: 'account not found' }] } });

      expect(error.detail).toBe('account not found');
    });

    it('reads the message envelope', () => {
      expect(fromHttp({ status: 400, data: { message: 'bad request' } }).detail).toBe(
        'bad request',
      );
    });

    it('reads the msg / dev_msg envelope', () => {
      const error = fromHttp({
        status: 400,
        data: { error: true, msg: 'Transfer failed', dev_msg: 'provider rejected' },
      });

      expect(error.detail).toContain('provider rejected');
    });

    it('unwraps json embedded in dev_msg, which is where provider errors hide', () => {
      const error = fromHttp({
        status: 400,
        data: { msg: 'Transfer failed', dev_msg: '{"message":"amount below minimum"}' },
      });

      expect(error.detail).toContain('amount below minimum');
    });

    it('survives an envelope it does not recognise', () => {
      expect(fromHttp({ status: 400, data: { unexpected: true } }).detail).toBeUndefined();
    });
  });

  describe('field errors', () => {
    it('maps a field-keyed 422 body for inline rendering', () => {
      const error = fromHttp({
        status: 422,
        data: { errors: { account_number: 'must be 10 digits', bank_code: 'unknown bank' } },
      });

      expect(error.fieldErrors).toEqual({
        account_number: 'must be 10 digits',
        bank_code: 'unknown bank',
      });
    });
  });

  describe('trace correlation', () => {
    it('carries the request id so the client error lines up with the backend log', () => {
      expect(fromHttp({ status: 500, headers: { 'x-request-id': 'req-123' } })).toMatchObject({
        traceId: 'req-123',
      });
    });
  });

  it('never promotes a server message into the user-facing key', () => {
    const error = fromHttp({ status: 400, data: { message: 'Raw English from the server' } });

    expect(error.titleKey).toMatch(/^errors\./);
    expect(error.titleKey).not.toContain('Raw English');
  });
});
