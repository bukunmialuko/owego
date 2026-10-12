import { unknownError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { AppError } from '@/core/errors/app-error';
import { createFakeTokenStore } from '@/test/fake-token-store';
import type {
  BiometricAvailability,
  BiometricPort,
  VaultBiometricOutcome,
  VaultPinOutcome,
} from '../port/auth-port';
import { MAX_UNLOCK_ATTEMPTS, createUnlockUseCase } from './unlock-usecase';

const TOKEN = 'refresh-token-1';
const PIN = '1357';

function durableCounter(initial = 0) {
  let count = initial;
  return {
    increment: () => Promise.resolve((count += 1)),
    read: () => Promise.resolve(count),
    reset: () => {
      count = 0;
      return Promise.resolve();
    },
    get value() {
      return count;
    },
  };
}

type Options = {
  biometricsOn?: boolean;
  availability?: BiometricAvailability;
  biometric?: Result<VaultBiometricOutcome, AppError>;
  pin?: Result<VaultPinOutcome, AppError>;
  attempts?: ReturnType<typeof durableCounter>;
};

function build(options: Options = {}) {
  const attempts = options.attempts ?? durableCounter();
  const tokenStore = createFakeTokenStore();
  const cleared: string[] = [];
  const calls = {
    biometricOpens: 0,
    pinOpens: 0,
    standalonePrompts: 0,
    availabilityChecks: 0,
    biometricsDropped: 0,
  };

  const biometrics: BiometricPort = {
    availability: () => {
      calls.availabilityChecks += 1;
      return Promise.resolve(options.availability ?? { type: 'available', kind: 'face-id' });
    },
    authenticate: () => {
      calls.standalonePrompts += 1;
      return Promise.resolve(ok('succeeded'));
    },
  };

  const usecase = createUnlockUseCase({
    biometrics,
    settings: {
      read: () => Promise.resolve({ pin: true, biometrics: options.biometricsOn ?? true }),
    },
    biometricSignIn: {
      disable: () => {
        calls.biometricsDropped += 1;
        return Promise.resolve(ok({ type: 'disabled' }));
      },
    },
    vault: {
      openWithBiometrics: () => {
        calls.biometricOpens += 1;
        return Promise.resolve(options.biometric ?? ok({ type: 'opened', refreshToken: TOKEN }));
      },
      openWithPin: (pin) => {
        calls.pinOpens += 1;
        if (pin !== PIN) return Promise.resolve(ok({ type: 'wrong-pin' }));
        return Promise.resolve(options.pin ?? ok({ type: 'opened', refreshToken: TOKEN }));
      },
    },
    tokenStore,
    pinRepository: {
      clearPin: () => {
        cleared.push('pin');
        return Promise.resolve(ok(undefined));
      },
    },
    attempts,
  });

  return { usecase, attempts, cleared, tokenStore, calls };
}

describe('UnlockUseCase', () => {
  describe('the biometric rung', () => {
    it('opens the sealed session and restores it before reporting unlocked', async () => {
      const { usecase, tokenStore } = build();

      await expect(usecase.tryBiometric()).resolves.toEqual(ok({ type: 'unlocked' }));
      expect(tokenStore.current).toEqual({ access: '', refresh: TOKEN });
    });

    it('shows no prompt of its own beside the keychain read', async () => {
      const { usecase, calls } = build();

      await usecase.tryBiometric();

      expect(calls).toMatchObject({ biometricOpens: 1, standalonePrompts: 0 });
    });

    it('clears the attempt count on a successful unlock', async () => {
      const attempts = durableCounter(2);
      const { usecase } = build({ attempts });

      await usecase.tryBiometric();

      expect(attempts.value).toBe(0);
    });

    it.each([
      ['a dismissed prompt', ok({ type: 'cancelled' } as const), 'cancelled'],
      ['an invalidated enrolment', ok({ type: 'invalidated' } as const), 'invalidated'],
    ])('falls to the pin rung on %s, restoring nothing', async (_label, biometric, reason) => {
      const { usecase, tokenStore } = build({ biometric });

      await expect(usecase.tryBiometric()).resolves.toEqual(ok({ type: 'needs-pin', reason }));
      expect(tokenStore.current).toBeUndefined();
    });

    it('asks nothing of the sensor and shows no prompt while biometrics are off', async () => {
      const { usecase, calls } = build({ biometricsOn: false });

      await expect(usecase.tryBiometric()).resolves.toEqual(
        ok({ type: 'needs-pin', reason: 'off' }),
      );
      expect(calls).toMatchObject({ availabilityChecks: 0, biometricOpens: 0 });
    });

    it.each([true, false])('offers biometrics only while they are on (%s)', async (on) => {
      const { usecase } = build({ biometricsOn: on });

      await expect(usecase.offersBiometrics()).resolves.toBe(on);
    });

    it('stops offering biometrics once the enrolment changed', async () => {
      const { usecase, calls } = build({ biometric: ok({ type: 'invalidated' }) });

      await usecase.tryBiometric();

      expect(calls.biometricsDropped).toBe(1);
    });

    it.each(['unavailable', 'not-enrolled'] as const)(
      'explains %s biometrics without showing a prompt that cannot work',
      async (availability) => {
        const { usecase, calls } = build({ availability: { type: availability } });

        await expect(usecase.tryBiometric()).resolves.toEqual(
          ok({ type: 'needs-pin', reason: availability }),
        );
        expect(calls.biometricOpens).toBe(0);
      },
    );

    it('signs out when nothing is sealed', async () => {
      const attempts = durableCounter(1);
      const { usecase, cleared } = build({ biometric: ok({ type: 'empty' }), attempts });

      await expect(usecase.tryBiometric()).resolves.toEqual(ok({ type: 'signed-out' }));
      expect(cleared).toContain('pin');
      expect(attempts.value).toBe(0);
    });

    it('passes a keychain failure through as an error, restoring nothing', async () => {
      const { usecase, tokenStore } = build({ biometric: err(unknownError('keychain')) });

      const outcome = await usecase.tryBiometric();

      expect(outcome.ok).toBe(false);
      expect(tokenStore.current).toBeUndefined();
    });
  });

  describe('the pin rung', () => {
    it('opens the sealed session and restores it before reporting unlocked', async () => {
      const { usecase, tokenStore } = build();

      await expect(usecase.tryPin(PIN)).resolves.toEqual(ok({ type: 'unlocked' }));
      expect(tokenStore.current).toEqual({ access: '', refresh: TOKEN });
    });

    it('never touches the biometric copy', async () => {
      const { usecase, calls } = build();

      await usecase.tryPin(PIN);

      expect(calls).toMatchObject({ biometricOpens: 0, standalonePrompts: 0, pinOpens: 1 });
    });

    it('reports the attempts left on a wrong pin, restoring nothing', async () => {
      const { usecase, tokenStore } = build();

      await expect(usecase.tryPin('0000')).resolves.toEqual(
        ok({ type: 'wrong-pin', attemptsLeft: MAX_UNLOCK_ATTEMPTS - 1 }),
      );
      expect(tokenStore.current).toBeUndefined();
    });

    it('counts down across attempts', async () => {
      const { usecase } = build();

      await usecase.tryPin('0000');
      const second = await usecase.tryPin('0000');

      expect(second.ok && second.value).toEqual({ type: 'wrong-pin', attemptsLeft: 1 });
    });

    it('clears the count once the right pin arrives', async () => {
      const { usecase, attempts } = build();

      await usecase.tryPin('0000');
      await usecase.tryPin(PIN);

      expect(attempts.value).toBe(0);
    });

    it('signs out when nothing is sealed', async () => {
      const { usecase, cleared } = build({ pin: ok({ type: 'empty' }) });

      await expect(usecase.tryPin(PIN)).resolves.toEqual(ok({ type: 'signed-out' }));
      expect(cleared).toContain('pin');
    });

    it('passes a keychain failure through, having still spent the attempt', async () => {
      const { usecase, attempts } = build({ pin: err(unknownError('keychain')) });

      const outcome = await usecase.tryPin(PIN);

      expect(outcome.ok).toBe(false);
      expect(attempts.value).toBe(1);
    });
  });

  describe('the counter is durable', () => {
    it('survives a process restart', async () => {
      const attempts = durableCounter();

      const first = build({ attempts });
      await first.usecase.tryPin('0000');
      await first.usecase.tryPin('0000');

      const second = build({ attempts });
      const outcome = await second.usecase.tryPin('0000');

      expect(outcome.ok && outcome.value).toEqual({ type: 'signed-out' });
      expect(second.cleared).toContain('pin');
    });

    it('still lets the correct pin through on the final attempt', async () => {
      const attempts = durableCounter(MAX_UNLOCK_ATTEMPTS - 1);
      const { usecase, tokenStore } = build({ attempts });

      await expect(usecase.tryPin(PIN)).resolves.toEqual(ok({ type: 'unlocked' }));
      expect(tokenStore.current?.refresh).toBe(TOKEN);
    });

    it('wipes everything once the attempts run out', async () => {
      const attempts = durableCounter(MAX_UNLOCK_ATTEMPTS - 1);
      const { usecase, cleared } = build({ attempts });

      await expect(usecase.tryPin('0000')).resolves.toEqual(ok({ type: 'signed-out' }));
      expect(cleared).toContain('pin');
      expect(attempts.value).toBe(0);
    });

    it('wipes when the final attempt cannot even be checked', async () => {
      const attempts = durableCounter(MAX_UNLOCK_ATTEMPTS - 1);
      const { usecase } = build({ attempts, pin: err(unknownError('keychain')) });

      await expect(usecase.tryPin(PIN)).resolves.toEqual(ok({ type: 'signed-out' }));
    });
  });

  describe('signing in instead', () => {
    it('wipes the pin and the counter', async () => {
      const attempts = durableCounter(2);
      const { usecase, cleared } = build({ attempts });

      await expect(usecase.abandon()).resolves.toEqual(ok({ type: 'signed-out' }));
      expect(cleared).toContain('pin');
      expect(attempts.value).toBe(0);
    });
  });

  it('reads the attempts left from durable storage', async () => {
    const { usecase } = build({ attempts: durableCounter(2) });

    await expect(usecase.attemptsLeft()).resolves.toBe(MAX_UNLOCK_ATTEMPTS - 2);
  });
});
