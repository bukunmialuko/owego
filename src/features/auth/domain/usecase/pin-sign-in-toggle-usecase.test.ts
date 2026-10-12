import { unknownError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import { createFakeTokenStore } from '@/test/fake-token-store';
import type { VaultBiometricOutcome } from '../port/auth-port';
import type { SignInSettings } from '../repository/auth-repository';
import { createPinSignInToggleUseCase } from './pin-sign-in-toggle-usecase';

const tokens = { access: 'a', refresh: 'refresh-1' };
const PIN = '1357';

function build(
  options: {
    settings?: SignInSettings;
    signedIn?: boolean;
    failSetPin?: boolean;
    failFlag?: boolean;
    biometricRung?: Result<VaultBiometricOutcome, AppError>;
  } = {},
) {
  const calls: string[] = [];
  let settings = options.settings ?? { pin: false, biometrics: false };
  let attemptCount = 2;

  const usecase = createPinSignInToggleUseCase({
    pinRepository: {
      setPin: () => {
        calls.push('set-pin');
        return Promise.resolve(
          options.failSetPin === true ? err(unknownError('keychain')) : ok(undefined),
        );
      },
      verifyPin: (pin) => Promise.resolve(ok(pin === PIN)),
      clearPin: () => {
        calls.push('clear-pin');
        return Promise.resolve(ok(undefined));
      },
      isPinSet: () => Promise.resolve(ok(true)),
    },
    settings: {
      read: () => Promise.resolve(settings),
      setPinEnabled: (pin) => {
        calls.push(`pin-flag:${String(pin)}`);
        if (options.failFlag === true) return Promise.resolve(err(unknownError('keychain')));
        settings = { ...settings, pin };
        return Promise.resolve(ok(undefined));
      },
      setBiometricsEnabled: (biometrics) => {
        calls.push(`biometric-flag:${String(biometrics)}`);
        settings = { ...settings, biometrics };
        return Promise.resolve(ok(undefined));
      },
    },
    attempts: {
      increment: () => Promise.resolve(1),
      read: () => Promise.resolve(attemptCount),
      reset: () => {
        attemptCount = 0;
        calls.push('reset-attempts');
        return Promise.resolve();
      },
    },
    tokenStore: createFakeTokenStore(options.signedIn === false ? undefined : tokens),
    vault: {
      seal: (refreshToken, pin) => {
        calls.push(`seal:${refreshToken}:${pin}`);
        return Promise.resolve(ok(undefined));
      },
      clear: () => {
        calls.push('clear-seals');
        return Promise.resolve(ok(undefined));
      },
      openWithBiometrics: () => {
        calls.push('prompt');
        return Promise.resolve(
          options.biometricRung ?? ok({ type: 'opened', refreshToken: 'refresh-1' }),
        );
      },
    },
  });

  return { usecase, calls, settings: () => settings, attemptsUsed: () => attemptCount };
}

describe('PinSignInToggleUseCase', () => {
  describe('enabling', () => {
    it('seals under the PIN, stores its digest and only then sets the flag, never prompting', async () => {
      const { usecase, calls, settings } = build();

      await expect(usecase.enable(PIN)).resolves.toEqual(ok({ type: 'enabled' }));
      expect(calls).toEqual([`seal:refresh-1:${PIN}`, 'set-pin', 'pin-flag:true']);
      expect(settings()).toEqual({ pin: true, biometrics: false });
    });

    it('rejects a guessable PIN before sealing anything', async () => {
      const { usecase, calls } = build();

      await expect(usecase.enable('1234')).resolves.toEqual(
        ok({ type: 'rejected', problem: 'consecutive' }),
      );
      expect(calls).toEqual([]);
    });

    it('refuses when there is no session to persist', async () => {
      const { usecase } = build({ signedIn: false });

      const result = await usecase.enable(PIN);

      expect(result.ok).toBe(false);
    });

    it('turns off a biometric flag left from an earlier seal before sealing again', async () => {
      const { usecase, calls, settings } = build({ settings: { pin: true, biometrics: true } });

      await usecase.enable(PIN);

      expect(calls[0]).toBe('biometric-flag:false');
      expect(settings()).toEqual({ pin: true, biometrics: false });
    });

    it.each([
      ['the PIN cannot be stored', { failSetPin: true }],
      ['the flag cannot be set', { failFlag: true }],
    ])('leaves nothing sealed when %s', async (_label, failure) => {
      const { usecase, calls } = build(failure);

      const result = await usecase.enable(PIN);

      expect(result.ok).toBe(false);
      expect(calls.slice(-2)).toEqual(['clear-seals', 'clear-pin']);
    });
  });

  describe('disabling', () => {
    it('refuses a wrong PIN and changes nothing', async () => {
      const { usecase, calls, settings } = build({ settings: { pin: true, biometrics: false } });

      await expect(usecase.disable({ pin: '0000' })).resolves.toEqual(
        ok({ type: 'challenge-failed' }),
      );
      expect(calls).toEqual([]);
      expect(settings().pin).toBe(true);
    });

    it('wipes every artefact on the correct PIN, flags last', async () => {
      const { usecase, calls, settings, attemptsUsed } = build({
        settings: { pin: true, biometrics: true },
      });

      await expect(usecase.disable({ pin: PIN })).resolves.toEqual(ok({ type: 'disabled' }));
      expect(calls).toEqual([
        'clear-seals',
        'clear-pin',
        'reset-attempts',
        'biometric-flag:false',
        'pin-flag:false',
      ]);
      expect(settings()).toEqual({ pin: false, biometrics: false });
      expect(attemptsUsed()).toBe(0);
    });

    it('accepts biometrics instead of the PIN while they are on', async () => {
      const { usecase, calls } = build({ settings: { pin: true, biometrics: true } });

      await expect(usecase.disable({})).resolves.toEqual(ok({ type: 'disabled' }));
      expect(calls[0]).toBe('prompt');
    });

    it('refuses biometrics while they are off, without prompting', async () => {
      const { usecase, calls } = build({ settings: { pin: true, biometrics: false } });

      await expect(usecase.disable({})).resolves.toEqual(ok({ type: 'challenge-failed' }));
      expect(calls).toEqual([]);
    });

    it.each<[string, VaultBiometricOutcome]>([
      ['cancelled', { type: 'cancelled' }],
      ['invalidated', { type: 'invalidated' }],
      ['empty', { type: 'empty' }],
    ])('refuses a biometric rung that answers %s', async (_label, outcome) => {
      const { usecase, settings } = build({
        settings: { pin: true, biometrics: true },
        biometricRung: ok(outcome),
      });

      await expect(usecase.disable({})).resolves.toEqual(ok({ type: 'challenge-failed' }));
      expect(settings().pin).toBe(true);
    });

    it('passes a keychain failure on the biometric rung through as an error', async () => {
      const { usecase } = build({
        settings: { pin: true, biometrics: true },
        biometricRung: err(unknownError('code: 7, msg: Too many attempts')),
      });

      await expect(usecase.disable({})).resolves.toMatchObject({ ok: false });
    });
  });
});
