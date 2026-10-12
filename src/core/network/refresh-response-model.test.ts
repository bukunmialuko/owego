import { ErrorCategory, ErrorCode } from '@/core/errors/app-error';
import { parseRefreshResponse, refreshResponseSchema } from './refresh-response-model';

describe('refreshResponseSchema', () => {
  it('parses an empty payload', () => {
    expect(refreshResponseSchema.parse({})).toEqual({ data: { token: '', refresh_token: '' } });
  });
});

describe('parseRefreshResponse', () => {
  it('reads the tokens out of the real envelope', () => {
    const result = parseRefreshResponse({
      data: { token: 'new-access', refresh_token: 'new-refresh' },
    });

    expect(result).toEqual({ ok: true, value: { access: 'new-access', refresh: 'new-refresh' } });
  });

  it('ignores the fields the refresh path has no use for', () => {
    const result = parseRefreshResponse({
      data: {
        token: 'new-access',
        refresh_token: 'new-refresh',
        user: { id: 'u1', firstname: 'Ada' },
        verification_status: { kyc_verified: true, is_pin_set: true },
      },
    });

    expect(result).toEqual({ ok: true, value: { access: 'new-access', refresh: 'new-refresh' } });
  });

  it('reports a payload with no access token as an auth failure', () => {
    const result = parseRefreshResponse({ data: { refresh_token: 'new-refresh' } });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected an error');
    expect(result.error.category).toBe(ErrorCategory.Auth);
    expect(result.error.code).toBe(ErrorCode.Unauthenticated);
  });

  it('reports a payload with no refresh token as an auth failure', () => {
    const result = parseRefreshResponse({ data: { token: 'new-access' } });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected an error');
    expect(result.error.category).toBe(ErrorCategory.Auth);
  });

  it('reports an empty body as an auth failure', () => {
    const result = parseRefreshResponse({});

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected an error');
    expect(result.error.category).toBe(ErrorCategory.Auth);
  });

  it('reports a non-object body as an auth failure', () => {
    const result = parseRefreshResponse('nope');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected an error');
    expect(result.error.category).toBe(ErrorCategory.Auth);
  });
});
