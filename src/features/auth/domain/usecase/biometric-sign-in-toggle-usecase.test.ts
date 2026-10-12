import { unknownError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { BiometricOutcome, VaultBiometricCopyOutcome } from '../port/auth-port';
import type { SignInSettings } from '../repository/auth-repository';
import { createBiometricSignInToggleUseCase } from './biometric-sign-in-toggle-usecase';

const PIN = '1357';

function build(
  options: {
    settings?: SignInSettings;
    prompt?: Result<BiometricOutcome, AppError>;
    copy?: (
      prove: () => Promise<Result<BiometricOutcome, AppError>>,
    ) => Promise<Result<VaultBiometricCopyOutcome, AppError>>;
    failBiometricFlag?: boolean;
  } = {},
) {
  const calls: string[] = [];
  let settings = options.settings ?? { pin: true, biometrics: false };

  const usecase = createBiometricSignInToggleUseCase({
    biometrics: {
      authenticate: () => {
        calls.push('prompt');
        return Promise.resolve(options.prompt ?? ok('succeeded'));
      },
    },
    settings: {
      read: () => Promise.resolve(settings),
      setPinEnabled: (pin) => {
        calls.push(`pin-flag:${String(pin)}`);
        settings = { ...settings, pin };
        return Promise.resolve(ok(undefined));
      },
      setBiometricsEnabled: (biometrics) => {
        calls.push(`biometric-flag:${String(biometrics)}`);
        if (options.failBiometricFlag === true) {
          return Promise.resolve(err(unknownError('keychain')));
        }
        settings = { ...settings, biometrics };
        return Promise.resolve(ok(undefined));
      },
    },
    vault: {
      addBiometricCopy: async (pin, prove) => {
        calls.push(`add-copy:${pin}`);
        if (options.copy !== undefined) return options.copy(prove);

        const proof = await prove();
        if (!proof.ok) return proof;

        return ok(
          proof.value === 'succeeded'
            ? { type: 'added' }
            : { type: 'not-proven', outcome: proof.value },
        );
      },
      removeBiometricCopy: () => {
        calls.push('remove-copy');
        return Promise.resolve(ok(undefined));
      },
    },
  });

  return { usecase, calls, settings: () => settings };
}

describe('BiometricSignInToggleUseCase', () => {
  describe('enabling', () => {
    it('adds the biometric copy with one prompt, then sets the flag', async () => {
      const { usecase, calls, settings } = build();

      await expect(usecase.enable(PIN)).resolves.toEqual(ok({ type: 'enabled' }));
      expect(calls).toEqual([`add-copy:${PIN}`, 'prompt', 'biometric-flag:true']);
      expect(settings()).toEqual({ pin: true, biometrics: true });
    });

    it('refuses while PIN sign-in is off, asking nothing of the sensor', async () => {
      const { usecase, calls } = build({ settings: { pin: false, biometrics: false } });

      await expect(usecase.enable(PIN)).resolves.toEqual(ok({ type: 'pin-sign-in-off' }));
      expect(calls).toEqual([]);
    });

    it('says a wrong PIN did not match, with no prompt and no flag', async () => {
      const { usecase, calls, settings } = build({
        copy: () => Promise.resolve(ok({ type: 'wrong-pin' })),
      });

      await expect(usecase.enable('2468')).resolves.toEqual(ok({ type: 'wrong-pin' }));
      expect(calls).toEqual(['add-copy:2468']);
      expect(settings().biometrics).toBe(false);
    });

    it.each<Exclude<BiometricOutcome, 'succeeded'>>([
      'cancelled',
      'unavailable',
      'not-enrolled',
      'invalidated',
    ])('leaves PIN sign-in exactly as it was when the prompt answers %s', async (outcome) => {
      const { usecase, settings } = build({ prompt: ok(outcome) });

      await expect(usecase.enable(PIN)).resolves.toEqual(
        ok({ type: 'not-enabled', reason: outcome }),
      );
      expect(settings()).toEqual({ pin: true, biometrics: false });
    });

    it('reports a vault with nothing sealed as PIN sign-in off', async () => {
      const { usecase } = build({ copy: () => Promise.resolve(ok({ type: 'empty' })) });

      await expect(usecase.enable(PIN)).resolves.toEqual(ok({ type: 'pin-sign-in-off' }));
    });

    it('passes a prompt that failed outright through, PIN sign-in untouched', async () => {
      const { usecase, settings } = build({ prompt: err(unknownError('lockout')) });

      await expect(usecase.enable(PIN)).resolves.toMatchObject({ ok: false });
      expect(settings()).toEqual({ pin: true, biometrics: false });
    });

    it('removes the copy again when the flag cannot be set', async () => {
      const { usecase, calls } = build({ failBiometricFlag: true });

      await expect(usecase.enable(PIN)).resolves.toMatchObject({ ok: false });
      expect(calls.at(-1)).toBe('remove-copy');
    });
  });

  describe('disabling', () => {
    it('removes the copy and the flag with no challenge', async () => {
      const { usecase, calls, settings } = build({ settings: { pin: true, biometrics: true } });

      await expect(usecase.disable()).resolves.toEqual(ok({ type: 'disabled' }));
      expect(calls).not.toContain('prompt');
      expect(settings()).toEqual({ pin: true, biometrics: false });
    });

    it('keeps a pre-PIN install persisting, writing the PIN flag first', async () => {
      const { usecase, calls } = build({ settings: { pin: true, biometrics: true } });

      await usecase.disable();

      expect(calls).toEqual(['pin-flag:true', 'remove-copy', 'biometric-flag:false']);
    });

    it('does nothing while biometrics are already off', async () => {
      const { usecase, calls } = build({ settings: { pin: false, biometrics: false } });

      await expect(usecase.disable()).resolves.toEqual(ok({ type: 'disabled' }));
      expect(calls).toEqual([]);
    });
  });
});
