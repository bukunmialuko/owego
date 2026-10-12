import { act, screen, userEvent, waitFor } from '@testing-library/react-native';
import { asValue } from 'awilix';
import type { AppError } from '@/core/errors/app-error';
import { serverError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import { err, ok } from '@/core/result/result';
import {
  createSessionStore,
  type SessionStore,
  type SessionUser,
} from '@/core/session/session-store';
import { Button, Text } from '@/shared/ui';
import { createFakeTokenStore } from '@/test/fake-token-store';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type {
  BiometricAvailability,
  BiometricOutcome,
  BiometricPort,
  SessionVault,
  UnlockAttemptStore,
} from '../../domain/port/auth-port';
import type {
  PinRepository,
  SignInSettingsRepository,
} from '../../domain/repository/auth-repository';
import {
  MAX_UNLOCK_ATTEMPTS,
  type UnlockOutcome,
  type UnlockUseCase,
} from '../../domain/usecase/unlock-usecase';
import { PROMPT_DELAY_MS, useUnlock } from './use-unlock';
import { KycState } from '@/core/session/onboarding-gate';

jest.useFakeTimers();

const USER: SessionUser = { id: 'u1', firstName: 'Ada', kycState: KycState.Approved };
const RIGHT_PIN = '1234';
const WRONG_PIN = '9999';

const COPY = {
  wrongPin: 'That PIN didn’t match.',
  unavailable: 'Biometric unlock isn’t available on this device.',
  notEnrolled: 'No biometrics are enrolled on this device.',
  invalidated: 'Your biometrics changed, so unlocking now needs your PIN.',
} as const;

type FakeBiometrics = BiometricPort & { promptCount: () => number };
type FakePinRepository = PinRepository & { isPinStored: () => boolean };
type FakeAttemptStore = UnlockAttemptStore & { used: () => number };

const answering = (outcome: BiometricOutcome) => () =>
  Promise.resolve<Result<BiometricOutcome, AppError>>(ok(outcome));

function createFakeBiometrics(
  respond: () => Promise<Result<BiometricOutcome, AppError>> = answering('cancelled'),
  availability: BiometricAvailability = { type: 'available', kind: 'face-id' },
): FakeBiometrics {
  let prompts = 0;

  return {
    authenticate: () => {
      prompts += 1;

      return respond();
    },
    availability: () => Promise.resolve(availability),
    promptCount: () => prompts,
  };
}

const SEALED_TOKEN = 'refresh-1';

function vaultOver(biometrics: FakeBiometrics, pinRepository: FakePinRepository): SessionVault {
  const unused = () => Promise.resolve(ok(undefined));

  return {
    seal: unused,
    addBiometricCopy: () => Promise.resolve(ok({ type: 'added' })),
    removeBiometricCopy: unused,
    reseal: unused,
    clear: unused,
    openWithBiometrics: async () => {
      const prompt = await biometrics.authenticate();
      if (!prompt.ok) return prompt;

      switch (prompt.value) {
        case 'succeeded':
          return ok({ type: 'opened', refreshToken: SEALED_TOKEN });
        case 'invalidated':
          return ok({ type: 'invalidated' });
        case 'cancelled':
        case 'unavailable':
        case 'not-enrolled':
          return ok({ type: 'cancelled' });
      }
    },
    openWithPin: async (pin) => {
      const verified = await pinRepository.verifyPin(pin);
      if (!verified.ok) return verified;

      return ok(
        verified.value ? { type: 'opened', refreshToken: SEALED_TOKEN } : { type: 'wrong-pin' },
      );
    },
  };
}

function createFakePinRepository(verify?: PinRepository['verifyPin']): FakePinRepository {
  let stored: string | undefined = RIGHT_PIN;

  return {
    setPin: (pin) => {
      stored = pin;

      return Promise.resolve(ok(undefined));
    },
    verifyPin: verify ?? ((pin) => Promise.resolve(ok(stored !== undefined && pin === stored))),
    clearPin: () => {
      stored = undefined;

      return Promise.resolve(ok(undefined));
    },
    isPinSet: () => Promise.resolve(ok(stored !== undefined)),
    isPinStored: () => stored !== undefined,
  };
}

function createFakeAttemptStore(): FakeAttemptStore {
  let used = 0;

  return {
    increment: () => Promise.resolve((used += 1)),
    read: () => Promise.resolve(used),
    reset: () => {
      used = 0;

      return Promise.resolve();
    },
    used: () => used,
  };
}

function stubUnlockUseCase(overrides: Partial<UnlockUseCase> = {}): UnlockUseCase {
  const inert = () =>
    Promise.resolve<Result<UnlockOutcome, AppError>>(
      ok({ type: 'needs-pin', reason: 'cancelled' }),
    );

  return {
    offersBiometrics: () => Promise.resolve(true),
    tryBiometric: inert,
    tryPin: inert,
    abandon: inert,
    attemptsLeft: () => Promise.resolve(MAX_UNLOCK_ATTEMPTS),
    ...overrides,
  };
}

type Fakes = {
  biometricsOn: boolean;
  sessionStore: SessionStore;
  biometrics: FakeBiometrics;
  pinRepository: FakePinRepository;
  attempts: FakeAttemptStore;
  unlockUseCase?: UnlockUseCase;
};

function lockedSessionStore(): SessionStore {
  const sessionStore = createSessionStore();
  sessionStore.getState().signedIn(USER, 'ready');
  sessionStore.getState().locked();

  return sessionStore;
}

function createFakes(overrides: Partial<Fakes> = {}): Fakes {
  return {
    biometricsOn: true,
    sessionStore: lockedSessionStore(),
    biometrics: createFakeBiometrics(),
    pinRepository: createFakePinRepository(),
    attempts: createFakeAttemptStore(),
    ...overrides,
  };
}

function signInSettings(biometricsOn: boolean): SignInSettingsRepository {
  const unchanged = () => Promise.resolve(ok(undefined));

  return {
    read: () => Promise.resolve({ pin: true, biometrics: biometricsOn }),
    setPinEnabled: unchanged,
    setBiometricsEnabled: unchanged,
  };
}

function containerFor({
  biometricsOn,
  sessionStore,
  biometrics,
  pinRepository,
  attempts,
  unlockUseCase,
}: Fakes) {
  return createTestContainer({
    signInSettingsRepository: asValue(signInSettings(biometricsOn)),
    sessionStore: asValue(sessionStore),
    biometricPort: asValue(biometrics),
    pinRepository: asValue(pinRepository),
    sessionVault: asValue(vaultOver(biometrics, pinRepository)),
    unlockAttemptStore: asValue(attempts),
    ...(unlockUseCase === undefined ? {} : { unlockUseCase: asValue(unlockUseCase) }),
  });
}

function Harness() {
  const { message, attemptsLeft, isBusy, offersBiometrics, promptBiometric, submitPin, abandon } =
    useUnlock();

  return (
    <>
      <Text>{message ?? 'no message'}</Text>
      <Text>{offersBiometrics ? 'biometrics offered' : 'pin only'}</Text>
      <Text>{`attempts left: ${attemptsLeft}`}</Text>
      <Text>{isBusy ? 'busy' : 'idle'}</Text>
      <Button
        label="Use biometrics"
        onPress={() => {
          void promptBiometric();
        }}
      />
      <Button
        label="Enter the right pin"
        onPress={() => {
          void submitPin(RIGHT_PIN);
        }}
      />
      <Button
        label="Enter the wrong pin"
        onPress={() => {
          void submitPin(WRONG_PIN);
        }}
      />
      <Button
        label="Sign in instead"
        onPress={() => {
          void abandon();
        }}
      />
    </>
  );
}

async function flushMountPrompt() {
  await act(async () => {
    jest.advanceTimersByTime(PROMPT_DELAY_MS);
  });
}

async function mountLadder(fakes: Fakes) {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  const view = await renderWithProviders(<Harness />, { container: containerFor(fakes) });
  await flushMountPrompt();

  return { user, ...view };
}

async function renderLadder(overrides: Partial<Fakes> = {}) {
  const fakes = createFakes(overrides);

  return { ...(await mountLadder(fakes)), ...fakes };
}

const press = (user: ReturnType<typeof userEvent.setup>, label: string) =>
  user.press(screen.getByRole('button', { name: label }));

describe('useUnlock — the biometric rung', () => {
  it('lets the screen settle before opening the prompt', async () => {
    const biometrics = createFakeBiometrics();
    await renderWithProviders(<Harness />, {
      container: containerFor(createFakes({ biometrics })),
    });

    await act(async () => {
      jest.advanceTimersByTime(PROMPT_DELAY_MS - 1);
    });
    expect(biometrics.promptCount()).toBe(0);

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(biometrics.promptCount()).toBe(1);
  });

  it('opens the os prompt on arrival without being asked', async () => {
    const { biometrics } = await renderLadder({ biometrics: createFakeBiometrics() });

    expect(biometrics.promptCount()).toBe(1);
  });

  it('returns the user to where they were when the prompt succeeds', async () => {
    const { sessionStore } = await renderLadder({
      biometrics: createFakeBiometrics(answering('succeeded')),
    });

    await waitFor(() => {
      expect(sessionStore.getState().stage).toBe('ready');
    });
    expect(sessionStore.getState().status).toBe('authenticated');
  });

  it('says nothing when the user dismisses the prompt', async () => {
    const { sessionStore } = await renderLadder({
      biometrics: createFakeBiometrics(answering('cancelled')),
    });

    expect(screen.getByText('no message')).toBeTruthy();
    expect(sessionStore.getState().stage).toBe('locked');
  });

  it.each([
    ['unavailable' as const, COPY.unavailable],
    ['not-enrolled' as const, COPY.notEnrolled],
  ])('explains %s biometrics without showing a prompt', async (availability, copy) => {
    const { sessionStore, biometrics } = await renderLadder({
      biometrics: createFakeBiometrics(answering('succeeded'), { type: availability }),
    });

    expect(await screen.findByText(copy)).toBeTruthy();
    expect(biometrics.promptCount()).toBe(0);
    expect(sessionStore.getState().stage).toBe('locked');
  });

  it('explains an invalidated enrolment in copy the user can act on', async () => {
    const { sessionStore } = await renderLadder({
      biometrics: createFakeBiometrics(answering('invalidated')),
    });

    expect(await screen.findByText(COPY.invalidated)).toBeTruthy();
    expect(sessionStore.getState().stage).toBe('locked');
  });

  it('holds the session in memory by the time the user is let back in', async () => {
    const tokenStore = createFakeTokenStore();
    const fakes = createFakes({ biometrics: createFakeBiometrics(answering('succeeded')) });
    await renderWithProviders(<Harness />, {
      container: createTestContainer({
        signInSettingsRepository: asValue(signInSettings(true)),
        sessionStore: asValue(fakes.sessionStore),
        biometricPort: asValue(fakes.biometrics),
        pinRepository: asValue(fakes.pinRepository),
        sessionVault: asValue(vaultOver(fakes.biometrics, fakes.pinRepository)),
        unlockAttemptStore: asValue(fakes.attempts),
        tokenStore: asValue(tokenStore),
      }),
    });
    await flushMountPrompt();

    await waitFor(() => {
      expect(fakes.sessionStore.getState().stage).toBe('ready');
    });
    expect(tokenStore.current).toEqual({ access: '', refresh: SEALED_TOKEN });
    expect(fakes.biometrics.promptCount()).toBe(1);
  });

  it('falls through to the pin rung when the prompt itself fails', async () => {
    const { sessionStore } = await renderLadder({
      biometrics: createFakeBiometrics(() =>
        Promise.resolve(err(serverError(500, 'biometry errSecUserCanceled -128'))),
      ),
    });

    expect(screen.getByText('no message')).toBeTruthy();
    expect(screen.queryByText(/errSecUserCanceled/)).toBeNull();
    expect(sessionStore.getState().stage).toBe('locked');
  });

  it('offers the prompt again when the user asks for it', async () => {
    let outcome: BiometricOutcome = 'cancelled';
    const biometrics = createFakeBiometrics(() => Promise.resolve(ok(outcome)));
    const { user, sessionStore } = await renderLadder({ biometrics });

    outcome = 'succeeded';
    await press(user, 'Use biometrics');

    expect(biometrics.promptCount()).toBe(2);
    await waitFor(() => {
      expect(sessionStore.getState().stage).toBe('ready');
    });
  });

  it('reports itself busy while the os prompt is open', async () => {
    let release: (() => void) | undefined;
    const biometrics = createFakeBiometrics(
      () =>
        new Promise<Result<BiometricOutcome, AppError>>((resolve) => {
          release = () => {
            resolve(ok('cancelled'));
          };
        }),
    );
    await renderLadder({ biometrics });

    expect(screen.getByText('busy')).toBeTruthy();

    await act(async () => {
      release?.();
    });

    expect(screen.getByText('idle')).toBeTruthy();
  });

  it('never opens the prompt when the screen is left before it fires', async () => {
    const fakes = createFakes({ biometrics: createFakeBiometrics(answering('succeeded')) });
    const view = await renderWithProviders(<Harness />, { container: containerFor(fakes) });

    await view.unmount();
    await flushMountPrompt();

    expect(fakes.biometrics.promptCount()).toBe(0);
  });
});

describe('useUnlock — the pin rung', () => {
  it('returns the user to where they were when the pin matches', async () => {
    const { user, sessionStore, attempts } = await renderLadder();

    await press(user, 'Enter the right pin');

    await waitFor(() => {
      expect(sessionStore.getState().stage).toBe('ready');
    });
    expect(attempts.used()).toBe(0);
  });

  it('counts a wrong pin down and says only that it did not match', async () => {
    const { user } = await renderLadder();

    await press(user, 'Enter the wrong pin');

    expect(await screen.findByText(COPY.wrongPin)).toBeTruthy();
    expect(screen.getByText('attempts left: 2')).toBeTruthy();
  });

  it('starts from the full allowance', async () => {
    await renderLadder();

    expect(screen.getByText(`attempts left: ${MAX_UNLOCK_ATTEMPTS}`)).toBeTruthy();
  });

  it('shows the attempts that actually remain after a relaunch', async () => {
    const attempts = createFakeAttemptStore();
    await attempts.increment();
    await attempts.increment();

    await renderLadder({ attempts });

    expect(await screen.findByText('attempts left: 1')).toBeTruthy();
  });

  it('signs the user out and wipes the pin on the last wrong attempt', async () => {
    const { user, sessionStore, pinRepository, attempts } = await renderLadder();

    await press(user, 'Enter the wrong pin');
    await press(user, 'Enter the wrong pin');

    expect(sessionStore.getState().status).toBe('authenticated');
    expect(screen.getByText('attempts left: 1')).toBeTruthy();

    await press(user, 'Enter the wrong pin');

    await waitFor(() => {
      expect(sessionStore.getState().status).toBe('unauthenticated');
    });
    expect(pinRepository.isPinStored()).toBe(false);
    expect(attempts.used()).toBe(0);
  });

  it('grants no fresh attempts to a screen that is mounted again', async () => {
    const fakes = createFakes();
    const first = await mountLadder(fakes);

    await press(first.user, 'Enter the wrong pin');
    await press(first.user, 'Enter the wrong pin');
    await first.unmount();

    const second = await mountLadder(fakes);
    await press(second.user, 'Enter the wrong pin');

    await waitFor(() => {
      expect(fakes.sessionStore.getState().status).toBe('unauthenticated');
    });
    expect(fakes.pinRepository.isPinStored()).toBe(false);
  });

  it('explains itself when the pin check cannot run', async () => {
    const { user, sessionStore } = await renderLadder({
      pinRepository: createFakePinRepository(() => Promise.resolve(err(serverError(500)))),
    });

    await press(user, 'Enter the wrong pin');

    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();
    expect(screen.queryByText('That PIN didn’t match.')).toBeNull();
    expect(sessionStore.getState().stage).toBe('locked');
  });

  it('reports itself busy while the pin is being checked', async () => {
    let release: (() => void) | undefined;
    const { user } = await renderLadder({
      pinRepository: createFakePinRepository(
        () =>
          new Promise((resolve) => {
            release = () => {
              resolve(ok(false));
            };
          }),
      ),
    });

    await press(user, 'Enter the wrong pin');

    expect(screen.getByText('busy')).toBeTruthy();

    await act(async () => {
      release?.();
    });

    expect(screen.getByText('idle')).toBeTruthy();
  });
});

describe('useUnlock — the way out', () => {
  it('signs out and clears the counter when the user chooses to sign in instead', async () => {
    const { user, sessionStore, pinRepository, attempts } = await renderLadder();

    await press(user, 'Enter the wrong pin');
    await press(user, 'Sign in instead');

    await waitFor(() => {
      expect(sessionStore.getState().status).toBe('unauthenticated');
    });
    expect(attempts.used()).toBe(0);
    expect(pinRepository.isPinStored()).toBe(false);
  });
});

describe('useUnlock — a PIN-only session', () => {
  it('does not open the prompt on arrival while biometrics are off', async () => {
    const { biometrics } = await renderLadder({ biometricsOn: false });

    expect(biometrics.promptCount()).toBe(0);
    expect(screen.getByText('no message')).toBeTruthy();
    expect(screen.getByText('pin only')).toBeTruthy();
  });

  it('unlocks with the PIN alone', async () => {
    const { user, sessionStore } = await renderLadder({ biometricsOn: false });

    await press(user, 'Enter the right pin');

    expect(sessionStore.getState().stage).toBe('ready');
  });

  it('offers biometrics while they are on', async () => {
    await renderLadder();

    expect(screen.getByText('biometrics offered')).toBeTruthy();
  });
});

describe('useUnlock — nothing left to open', () => {
  it('signs out when the biometric rung finds nothing sealed', async () => {
    const { sessionStore } = await renderLadder({
      unlockUseCase: stubUnlockUseCase({
        tryBiometric: () => Promise.resolve(ok({ type: 'signed-out' })),
      }),
    });

    await waitFor(() => {
      expect(sessionStore.getState().status).toBe('unauthenticated');
    });
  });
});

describe('useUnlock — outcomes the ladder does not produce', () => {
  it('ignores a wrong-pin outcome arriving from the biometric rung', async () => {
    const { sessionStore } = await renderLadder({
      unlockUseCase: stubUnlockUseCase({
        tryBiometric: () => Promise.resolve(ok({ type: 'wrong-pin', attemptsLeft: 1 })),
      }),
    });

    expect(screen.getByText('no message')).toBeTruthy();
    expect(screen.getByText(`attempts left: ${MAX_UNLOCK_ATTEMPTS}`)).toBeTruthy();
    expect(sessionStore.getState().stage).toBe('locked');
  });

  it('ignores a needs-pin outcome arriving from the pin rung', async () => {
    const { user, sessionStore } = await renderLadder({
      unlockUseCase: stubUnlockUseCase({
        tryPin: () => Promise.resolve(ok({ type: 'needs-pin', reason: 'invalidated' })),
      }),
    });

    await press(user, 'Enter the right pin');

    expect(screen.getByText('no message')).toBeTruthy();
    expect(sessionStore.getState().stage).toBe('locked');
  });
});
