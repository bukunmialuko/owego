import { unknownError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { AppError } from '@/core/errors/app-error';
import type { SignInSettings } from '../../domain/repository/auth-repository';
import { createAdaptiveTokenPersistence } from './adaptive-token-persistence';

const PIN_ONLY: SignInSettings = { pin: true, biometrics: false };
const OFF: SignInSettings = { pin: false, biometrics: false };

function build(initial: SignInSettings = PIN_ONLY) {
  let current = initial;
  const resealed: string[] = [];
  let cleared = 0;
  let resealAnswer: Result<void, AppError> = ok(undefined);

  const persistence = createAdaptiveTokenPersistence({
    settings: { read: () => Promise.resolve(current) },
    vault: {
      reseal: (refreshToken) => {
        resealed.push(refreshToken);
        return Promise.resolve(resealAnswer);
      },
      clear: () => {
        cleared += 1;
        return Promise.resolve(ok(undefined));
      },
    },
  });

  return {
    persistence,
    resealed,
    cleared: () => cleared,
    setSettings: (next: SignInSettings) => {
      current = next;
    },
    failReseal: () => {
      resealAnswer = err(unknownError('keychain full'));
    },
  };
}

describe('AdaptiveTokenPersistence', () => {
  it('persists when PIN sign-in is on without biometrics', async () => {
    await expect(build(PIN_ONLY).persistence.persists()).resolves.toBe(true);
  });

  it('persists when biometrics are on top of the PIN', async () => {
    await expect(build({ pin: true, biometrics: true }).persistence.persists()).resolves.toBe(true);
  });

  it('does not persist when PIN sign-in is off', async () => {
    await expect(build(OFF).persistence.persists()).resolves.toBe(false);
  });

  it('re-seals the rotated token through the vault when on', async () => {
    const { persistence, resealed } = build(PIN_ONLY);

    await expect(persistence.save('refresh-2')).resolves.toEqual(ok(undefined));
    expect(resealed).toEqual(['refresh-2']);
  });

  it('writes nothing at all when off', async () => {
    const { persistence, resealed } = build(OFF);

    await persistence.save('refresh-2');

    expect(resealed).toEqual([]);
  });

  it('decides on every call, so the toggle takes effect at once', async () => {
    const { persistence, resealed, setSettings } = build(OFF);

    await persistence.save('refresh-1');
    setSettings(PIN_ONLY);
    await persistence.save('refresh-2');

    expect(resealed).toEqual(['refresh-2']);
  });

  it('reports a failed re-seal', async () => {
    const { persistence, failReseal } = build(PIN_ONLY);
    failReseal();

    const saved = await persistence.save('refresh-2');

    expect(saved.ok).toBe(false);
  });

  it('clears the vault whether or not the flag is on', async () => {
    const { persistence, cleared } = build(OFF);

    await persistence.clear();

    expect(cleared()).toBe(1);
  });
});
