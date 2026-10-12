import { act, screen, userEvent, waitFor } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { ok } from '@/core/result/result';
import { createSessionStore, type SessionStore } from '@/core/session/session-store';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type { SessionVault, UnlockAttemptStore } from '../domain/port/auth-port';
import { PROMPT_DELAY_MS } from './hook/use-unlock';
import { UnlockScreen } from './unlock-screen';
import { KycState } from '@/core/session/onboarding-gate';

jest.useFakeTimers();

const RIGHT_PIN = '1357';

function fakeVault(biometric: 'opened' | 'cancelled' = 'cancelled') {
  let biometricReads = 0;
  const vault: SessionVault = {
    seal: () => Promise.resolve(ok(undefined)),
    addBiometricCopy: () => Promise.resolve(ok({ type: 'added' })),
    removeBiometricCopy: () => Promise.resolve(ok(undefined)),
    reseal: () => Promise.resolve(ok(undefined)),
    clear: () => Promise.resolve(ok(undefined)),
    openWithBiometrics: () => {
      biometricReads += 1;
      return Promise.resolve(
        ok(biometric === 'opened' ? { type: 'opened', refreshToken: 'r' } : { type: 'cancelled' }),
      );
    },
    openWithPin: (pin) =>
      Promise.resolve(
        ok(pin === RIGHT_PIN ? { type: 'opened', refreshToken: 'r' } : { type: 'wrong-pin' }),
      ),
  };

  return { vault, biometricReads: () => biometricReads };
}

function attemptStore(): UnlockAttemptStore {
  let used = 0;
  return {
    increment: () => Promise.resolve((used += 1)),
    read: () => Promise.resolve(used),
    reset: () => {
      used = 0;
      return Promise.resolve();
    },
  };
}

function lockedAs(firstName: string): SessionStore {
  const store = createSessionStore();
  store.getState().signedIn({ id: 'u1', firstName, kycState: KycState.Approved }, 'ready');
  store.getState().locked();
  return store;
}

async function renderUnlock({
  sessionStore = lockedAs('Ada'),
  device = fakeVault(),
  biometricsOn = true,
}: {
  sessionStore?: SessionStore;
  device?: ReturnType<typeof fakeVault>;
  biometricsOn?: boolean;
} = {}) {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  const unchanged = () => Promise.resolve(ok(undefined));

  await renderWithProviders(<UnlockScreen />, {
    container: createTestContainer({
      signInSettingsRepository: asValue({
        read: () => Promise.resolve({ pin: true, biometrics: biometricsOn }),
        setPinEnabled: unchanged,
        setBiometricsEnabled: unchanged,
      }),
      sessionStore: asValue(sessionStore),
      sessionVault: asValue(device.vault),
      unlockAttemptStore: asValue(attemptStore()),
      biometricPort: asValue({
        availability: () => Promise.resolve({ type: 'available', kind: 'face-id' } as const),
        authenticate: () => Promise.resolve(ok('succeeded' as const)),
      }),
    }),
  });
  await act(async () => {
    jest.advanceTimersByTime(PROMPT_DELAY_MS);
  });

  const press = async (name: string) => {
    await user.press(await screen.findByRole('button', { name }));
  };

  return {
    user,
    sessionStore,
    device,
    press,
    typeDigits: async (digits: string) => {
      for (const digit of digits) await press(digit);
    },
  };
}

describe('UnlockScreen', () => {
  it('greets the signed-in user by name', async () => {
    await renderUnlock();

    expect(await screen.findByText('Welcome back, Ada')).toBeOnTheScreen();
  });

  it('fills the dots, removes one per delete, and holds Continue until four digits', async () => {
    const { typeDigits, press } = await renderUnlock();

    await typeDigits('135');
    expect(screen.getByLabelText('3 of 4 digits entered')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();

    await press('Delete');
    expect(screen.getByLabelText('2 of 4 digits entered')).toBeOnTheScreen();

    await typeDigits('57');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('lets the user back in with the right pin', async () => {
    const { typeDigits, press, sessionStore } = await renderUnlock();

    await typeDigits(RIGHT_PIN);
    await press('Continue');

    await waitFor(() => {
      expect(sessionStore.getState().stage).toBe('ready');
    });
  });

  it('says a wrong pin did not match, counts it down, and clears the dots', async () => {
    const { typeDigits, press, sessionStore } = await renderUnlock();

    await typeDigits('2468');
    await press('Continue');

    expect(await screen.findByText('That PIN didn’t match.')).toBeOnTheScreen();
    expect(await screen.findByText('2 attempts left.')).toBeOnTheScreen();
    expect(screen.getByLabelText('0 of 4 digits entered')).toBeOnTheScreen();
    expect(sessionStore.getState().stage).toBe('locked');
  });

  it('shows how many attempts are left before any is spent', async () => {
    await renderUnlock();

    expect(await screen.findByText('3 attempts left.')).toBeOnTheScreen();
  });

  it('offers the biometric prompt again from the pad’s bottom-left cell', async () => {
    const device = fakeVault();
    const { press } = await renderUnlock({ device });
    expect(device.biometricReads()).toBe(1);

    await press('Unlock with Face ID or fingerprint');

    expect(device.biometricReads()).toBe(2);
  });

  it('offers no biometric retry on a PIN-only session', async () => {
    const device = fakeVault();
    await renderUnlock({ device, biometricsOn: false });

    expect(await screen.findByText('3 attempts left.')).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Unlock with Face ID or fingerprint' }),
    ).not.toBeOnTheScreen();
    expect(device.biometricReads()).toBe(0);
  });

  it('signs out at once from Wrong account', async () => {
    const { press, sessionStore } = await renderUnlock();

    await press('Wrong account');

    await waitFor(() => {
      expect(sessionStore.getState().status).toBe('unauthenticated');
    });
  });

  describe('resetting a forgotten pin', () => {
    it('asks for confirmation before anything is wiped', async () => {
      const { user, sessionStore } = await renderUnlock();

      await user.press(screen.getByRole('link', { name: 'Reset' }));

      expect(await screen.findByText('Reset your login PIN?')).toBeOnTheScreen();
      expect(sessionStore.getState().status).toBe('authenticated');
    });

    it('keeps the session locked when the user changes their mind', async () => {
      const { user, press, sessionStore } = await renderUnlock();
      await user.press(screen.getByRole('link', { name: 'Reset' }));

      await press('Cancel');

      expect(sessionStore.getState().stage).toBe('locked');
      expect(sessionStore.getState().status).toBe('authenticated');
    });

    it('signs out through the same path once confirmed', async () => {
      const { user, press, sessionStore } = await renderUnlock();
      await user.press(screen.getByRole('link', { name: 'Reset' }));

      await press('Reset and sign in');

      await waitFor(() => {
        expect(sessionStore.getState().status).toBe('unauthenticated');
      });
    });
  });

  it('offers no text field for the pin', async () => {
    await renderUnlock();

    expect(JSON.stringify(screen.toJSON())).not.toContain('"type":"TextInput"');
  });
});
