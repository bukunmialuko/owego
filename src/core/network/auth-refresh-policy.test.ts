import { shouldAttemptRefresh, shouldAttemptSessionRefreshForStatus } from './auth-refresh-policy';

describe('shouldAttemptRefresh', () => {
  it('refreshes for an ordinary authenticated call', () => {
    expect(shouldAttemptRefresh({ url: '/transaction' })).toBe(true);
    expect(shouldAttemptRefresh({ url: '/user/wallets' })).toBe(true);
  });

  describe('auth endpoints are exempt', () => {
    it('skips sign-in', () => {
      expect(shouldAttemptRefresh({ url: '/auth/google' })).toBe(false);
      expect(shouldAttemptRefresh({ url: '/api/v1/auth/apple' })).toBe(false);
    });

    it('skips the refresh endpoint itself', () => {
      expect(shouldAttemptRefresh({ url: '/auth/refresh' })).toBe(false);
      expect(shouldAttemptRefresh({ url: '/refresh/token' })).toBe(false);
    });
  });

  it('honours an explicit opt-out', () => {
    expect(shouldAttemptRefresh({ url: '/transaction', skipAuthRefresh: true })).toBe(false);
  });

  it('treats a missing url as ineligible', () => {
    expect(shouldAttemptRefresh({})).toBe(false);
  });
});

describe('shouldAttemptSessionRefreshForStatus', () => {
  it('refreshes on 401', () => {
    expect(shouldAttemptSessionRefreshForStatus(401)).toBe(true);
  });

  it('refreshes on 403', () => {
    expect(shouldAttemptSessionRefreshForStatus(403)).toBe(true);
  });

  it('leaves every other status alone', () => {
    for (const status of [200, 400, 404, 409, 422, 429, 500, 503]) {
      expect(shouldAttemptSessionRefreshForStatus(status)).toBe(false);
    }
  });
});
