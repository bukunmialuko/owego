import { startVerification, VerificationStatus } from '@didit-protocol/sdk-react-native';
import type { VerificationErrorType } from '@didit-protocol/sdk-react-native';
import type { VerificationFailureReason } from '../../domain/entity/kyc-entity';
import { createDiditSdkAdapter } from './didit-sdk-adapter';

const sdk = jest.mocked(startVerification);

const adapter = createDiditSdkAdapter();

beforeEach(() => {
  sdk.mockReset();
});

const REASONS: [VerificationErrorType, VerificationFailureReason][] = [
  ['cameraAccessDenied', 'camera-access-denied'],
  ['sessionExpired', 'session-expired'],
  ['retryBlocked', 'retry-blocked'],
  ['networkError', 'network'],
  ['notInitialized', 'unknown'],
  ['apiError', 'unknown'],
  ['unknown', 'unknown'],
];

describe('DiditSdkAdapter', () => {
  it('hands the session token to the sdk with logging off', async () => {
    sdk.mockResolvedValue({ type: 'cancelled' });

    await adapter.verify('token-1');

    expect(sdk).toHaveBeenCalledWith('token-1', { loggingEnabled: false });
  });

  it.each([VerificationStatus.Approved, VerificationStatus.Pending, VerificationStatus.Declined])(
    'reports a completed flow without the %s status the sdk saw',
    async (status) => {
      sdk.mockResolvedValue({ type: 'completed', session: { sessionId: 's1', status } });

      await expect(adapter.verify('token-1')).resolves.toEqual({
        ok: true,
        value: { type: 'completed' },
      });
    },
  );

  it('reports a cancellation as a value rather than an error', async () => {
    sdk.mockResolvedValue({ type: 'cancelled' });

    await expect(adapter.verify('token-1')).resolves.toEqual({
      ok: true,
      value: { type: 'cancelled' },
    });
  });

  it.each(REASONS)('maps the %s error onto %s', async (errorType, reason) => {
    sdk.mockResolvedValue({ type: 'failed', error: { type: errorType, message: 'nope' } });

    await expect(adapter.verify('token-1')).resolves.toEqual({
      ok: true,
      value: { type: 'failed', reason },
    });
  });

  it('reports an error only when the sdk itself could not run', async () => {
    sdk.mockRejectedValue(new Error('TurboModule not found'));

    const result = await adapter.verify('token-1');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected the sdk failure to surface as an error');
    expect(result.error.detail).toMatch(/could not run/i);
  });

  it('never puts the session token in the error it reports', async () => {
    sdk.mockRejectedValue(new Error('boom'));

    const result = await adapter.verify('super-secret-token');

    expect(JSON.stringify(result)).not.toContain('super-secret-token');
  });
});
