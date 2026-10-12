import { createSecureStorage } from './keychain-secure-storage';
import type { SecureStorage } from './secure-storage';

describe('SecureStorage', () => {
  let storage: SecureStorage;

  beforeEach(() => {
    storage = createSecureStorage();
  });

  it('round-trips a secret', async () => {
    await storage.set('auth_token', 'jwt-value');

    await expect(storage.get('auth_token')).resolves.toEqual({ ok: true, value: 'jwt-value' });
  });

  it('resolves to undefined for a secret that was never stored', async () => {
    await expect(storage.get('never_set')).resolves.toEqual({ ok: true, value: undefined });
  });

  it('removes a secret', async () => {
    await storage.set('app_lock_pin_hash', 'sha256');
    await storage.remove('app_lock_pin_hash');

    await expect(storage.get('app_lock_pin_hash')).resolves.toEqual({
      ok: true,
      value: undefined,
    });
  });

  it('keeps a plain entry on this device, readable after first unlock', async () => {
    const keychain: { setGenericPassword: jest.Mock } = jest.requireMock('react-native-keychain');

    await storage.set('session_key_pin_sealed', 'sealed');

    const [, , options] = keychain.setGenericPassword.mock.lastCall as [string, string, object];
    expect(options).toEqual({
      service: 'session_key_pin_sealed',
      accessible: 'AccessibleAfterFirstUnlockThisDeviceOnly',
    });
  });

  describe('a dismissed biometric prompt', () => {
    const keychain: { getGenericPassword: jest.Mock } = jest.requireMock('react-native-keychain');
    const gated = { requireBiometrics: true, promptMessage: 'Unlock owego' } as const;

    function rejectWith(cause: Error & { code?: string }) {
      keychain.getGenericPassword.mockImplementationOnce(() => Promise.reject(cause));
    }

    function withCode(message: string, code: string) {
      return Object.assign(new Error(message), { code });
    }

    it.each([
      ['iOS', withCode('User canceled the operation.', '-128')],
      ['Android, the cancel button', withCode('code: 13, msg: Cancel', 'E_CRYPTO_FAILED')],
      [
        'Android, dismissed',
        withCode('code: 10, msg: Fingerprint operation cancelled by user.', 'E_CRYPTO_FAILED'),
      ],
      ['Android, cancelled by the system', withCode('code: 5, msg: Canceled', 'E_CRYPTO_FAILED')],
    ])('is reported as a cancellation on %s', async (_platform, cause) => {
      rejectWith(cause);

      const result = await storage.get('session_key', gated);

      expect(result.ok || result.error.code).toBe('auth/prompt-cancelled');
    });

    it('leaves any other failure as a plain error', async () => {
      rejectWith(withCode('code: 7, msg: Too many attempts', 'E_CRYPTO_FAILED'));

      const result = await storage.get('session_key', gated);

      expect(result.ok || result.error.code).toBe('common/unknown');
    });
  });

  describe('the iOS size limit', () => {
    it('rejects a value larger than the keychain can hold', async () => {
      const oversized = 'x'.repeat(2049);

      const result = await storage.set('wallet_list', oversized);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected the size guard to reject');
      expect(result.error.detail).toMatch(/2048/);
    });

    it('accepts a value at the limit', async () => {
      const atLimit = 'x'.repeat(2048);

      await expect(storage.set('token', atLimit)).resolves.toEqual({ ok: true, value: undefined });
    });
  });
});
