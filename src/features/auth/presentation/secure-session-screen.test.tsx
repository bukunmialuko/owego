import { act, screen, userEvent, waitFor } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { BackHandler } from 'react-native';
import { unknownError } from '@/core/errors/app-error';
import { createEphemeralTokenPersistence } from '@/core/network/token-persistence';
import { err, ok } from '@/core/result/result';
import { KycState } from '@/core/session/onboarding-gate';
import { createSessionStore, type SessionStore } from '@/core/session/session-store';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type { BiometricAvailability } from '../domain/port/auth-port';
import type { BiometricSignInToggleUseCase } from '../domain/usecase/biometric-sign-in-toggle-usecase';
import type { PinSignInToggleUseCase } from '../domain/usecase/pin-sign-in-toggle-usecase';
import type { ReadSignInSecurityUseCase } from '../domain/usecase/read-sign-in-security-usecase';
import { SecureSessionScreen } from './secure-session-screen';

jest.useFakeTimers();

type EnableResult = Awaited<ReturnType<PinSignInToggleUseCase['enable']>>;
type BiometricEnableResult = Awaited<ReturnType<BiometricSignInToggleUseCase['enable']>>;

const PIN = '1357';
const FACE_ID: BiometricAvailability = { type: 'available', kind: 'face-id' };

const COPY = {
  title: 'Set your sign-in PIN',
  body: 'Use it to get back in quickly. Without it, you’ll sign in with Google or Apple each time the app closes.',
  offer: 'Use Face ID to get back in?',
  unknown: 'Something went wrong. Please try again.',
} as const;

let hardwareBack: Parameters<typeof BackHandler.addEventListener>[1] | undefined;
const BACK_PRESS = { type: 'hardwareBackPress', timeStamp: 0 };

beforeEach(() => {
  hardwareBack = undefined;
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    hardwareBack = handler;
    return { remove: () => undefined };
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

function atSecureSession(kycState: KycState): SessionStore {
  const store = createSessionStore();
  store.getState().signedIn({ id: 'u1', firstName: 'Ada', kycState }, 'secure-session');
  return store;
}

async function renderStage({
  enableAnswer = ok({ type: 'enabled' }),
  kycState = KycState.Approved,
  device = { type: 'unavailable' },
  biometricAnswer = ok({ type: 'enabled' }),
}: {
  enableAnswer?: EnableResult;
  kycState?: KycState;
  device?: BiometricAvailability;
  biometricAnswer?: BiometricEnableResult;
} = {}) {
  const sessionStore = atSecureSession(kycState);
  let isKept = false;
  const enable = jest.fn((_pin: string) => {
    isKept = enableAnswer.ok && enableAnswer.value.type === 'enabled';
    return Promise.resolve(enableAnswer);
  });
  const enableBiometrics = jest.fn((_pin: string) => Promise.resolve(biometricAnswer));
  const pinSignIn: PinSignInToggleUseCase = {
    enable,
    disable: () => Promise.resolve(ok({ type: 'disabled' })),
  };
  const biometricSignIn: BiometricSignInToggleUseCase = {
    enable: enableBiometrics,
    disable: () => Promise.resolve(ok({ type: 'disabled' })),
  };
  const readSecurity: ReadSignInSecurityUseCase = {
    execute: () => Promise.resolve({ pin: isKept, biometrics: false, device }),
  };
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

  await renderWithProviders(<SecureSessionScreen />, {
    container: createTestContainer({
      sessionStore: asValue(sessionStore),
      pinSignInToggleUseCase: asValue(pinSignIn),
      biometricSignInToggleUseCase: asValue(biometricSignIn),
      readSignInSecurityUseCase: asValue(readSecurity),
      tokenPersistence: asValue({
        ...createEphemeralTokenPersistence(),
        persists: () => Promise.resolve(isKept),
      }),
    }),
  });

  const press = async (name: string) => {
    await user.press(await screen.findByRole('button', { name }));
  };
  const typeDigits = async (digits: string) => {
    for (const digit of digits) await press(digit);
  };

  return {
    sessionStore,
    enable,
    enableBiometrics,
    press,
    typeDigits,
    chooseAndConfirm: async (first: string, second = first) => {
      await typeDigits(first);
      await press('Continue');
      await typeDigits(second);
      await press('Continue');
    },
  };
}

function hasResponder(node: unknown): boolean {
  if (typeof node !== 'object' || node === null) return false;
  const { props, children } = node as {
    props?: Record<string, unknown>;
    children?: unknown[];
  };
  if (typeof props?.['onMoveShouldSetResponder'] === 'function') return true;
  return (children ?? []).some(hasResponder);
}

describe('SecureSessionScreen', () => {
  it('asks for a sign-in PIN, saying what declining costs', async () => {
    await renderStage();

    expect(await screen.findByText(COPY.title)).toBeOnTheScreen();
    expect(screen.getByText(COPY.body)).toBeOnTheScreen();
    expect(screen.getByLabelText('0 of 4 digits entered')).toBeOnTheScreen();
  });

  it('fills the dots, removes one per delete, and holds Continue until four digits', async () => {
    const { typeDigits, press } = await renderStage();

    await typeDigits('135');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await press('Delete');
    expect(screen.getByLabelText('2 of 4 digits entered')).toBeOnTheScreen();
    await typeDigits('57');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('enables with the confirmed PIN and moves on, with no offer on a device without biometrics', async () => {
    const { chooseAndConfirm, enable, enableBiometrics, sessionStore } = await renderStage();

    await chooseAndConfirm(PIN);

    expect(enable).toHaveBeenCalledWith(PIN);
    await waitFor(() => {
      expect(sessionStore.getState().stage).toBe('ready');
    });
    expect(screen.queryByText(COPY.offer)).not.toBeOnTheScreen();
    expect(enableBiometrics).not.toHaveBeenCalled();
  });

  it('clears the entry and says so when the two PINs differ', async () => {
    const { chooseAndConfirm, enable } = await renderStage();

    await chooseAndConfirm(PIN, '2468');

    expect(await screen.findByText('Those PINs didn’t match. Try again.')).toBeOnTheScreen();
    expect(enable).not.toHaveBeenCalled();
  });

  it('says why a guessable PIN was refused and starts over', async () => {
    const { chooseAndConfirm, sessionStore } = await renderStage({
      enableAnswer: ok({ type: 'rejected', problem: 'consecutive' }),
    });

    await chooseAndConfirm('1234');

    expect(await screen.findByText('Don’t use consecutive digits.')).toBeOnTheScreen();
    expect(screen.getByText(COPY.title)).toBeOnTheScreen();
    expect(sessionStore.getState().stage).toBe('secure-session');
  });

  it('says something went wrong when enabling fails outright', async () => {
    const { chooseAndConfirm } = await renderStage({ enableAnswer: err(unknownError('keychain')) });

    await chooseAndConfirm(PIN);

    expect(await screen.findByText(COPY.unknown)).toBeOnTheScreen();
  });

  it('moves on without enabling from Not now, remembering it for this session', async () => {
    const { press, enable, sessionStore } = await renderStage();

    await press('Not now');

    await waitFor(() => {
      expect(sessionStore.getState().stage).toBe('ready');
    });
    expect(sessionStore.getState().hasDeclinedSignInPin).toBe(true);
    expect(enable).not.toHaveBeenCalled();
  });

  it('offers verification after Not now to a wallet holder who still owes it', async () => {
    const { press, sessionStore } = await renderStage({ kycState: KycState.NotStarted });

    await press('Not now');

    await waitFor(() => {
      expect(sessionStore.getState().stage).toBe('kyc');
    });
  });

  it('offers verification after enabling to a wallet holder who still owes it', async () => {
    const { chooseAndConfirm, sessionStore } = await renderStage({
      kycState: KycState.NotStarted,
    });

    await chooseAndConfirm(PIN);

    await waitFor(() => {
      expect(sessionStore.getState().stage).toBe('kyc');
    });
  });

  describe('the biometric offer', () => {
    it('is made once the PIN is set, on a device that has Face ID', async () => {
      const { chooseAndConfirm, sessionStore } = await renderStage({ device: FACE_ID });

      await chooseAndConfirm(PIN);

      expect(await screen.findByText(COPY.offer)).toBeOnTheScreen();
      expect(sessionStore.getState().stage).toBe('secure-session');
    });

    it('turns Face ID on with the PIN just set, then moves on', async () => {
      const { chooseAndConfirm, press, enableBiometrics, sessionStore } = await renderStage({
        device: FACE_ID,
      });
      await chooseAndConfirm(PIN);

      await press('Use Face ID');

      expect(enableBiometrics).toHaveBeenCalledWith(PIN);
      await waitFor(() => {
        expect(sessionStore.getState().stage).toBe('ready');
      });
    });

    it.each<[string, BiometricEnableResult]>([
      ['is dismissed', ok({ type: 'not-enabled', reason: 'cancelled' })],
      ['is unavailable', ok({ type: 'not-enabled', reason: 'unavailable' })],
      ['has nothing enrolled', ok({ type: 'not-enabled', reason: 'not-enrolled' })],
      ['fails outright', err(unknownError('lockout'))],
    ])('moves on silently with PIN sign-in on when the prompt %s', async (_label, answer) => {
      const { chooseAndConfirm, press, sessionStore } = await renderStage({
        device: FACE_ID,
        biometricAnswer: answer,
      });
      await chooseAndConfirm(PIN);

      await press('Use Face ID');

      await waitFor(() => {
        expect(sessionStore.getState().stage).toBe('ready');
      });
      expect(screen.queryByText(COPY.unknown)).not.toBeOnTheScreen();
      expect(sessionStore.getState().hasDeclinedSignInPin).toBe(false);
    });

    it('moves on from Not now without prompting', async () => {
      const { chooseAndConfirm, press, enableBiometrics, sessionStore } = await renderStage({
        device: FACE_ID,
      });
      await chooseAndConfirm(PIN);

      await press('Not now');

      await waitFor(() => {
        expect(sessionStore.getState().stage).toBe('ready');
      });
      expect(enableBiometrics).not.toHaveBeenCalled();
      expect(sessionStore.getState().hasDeclinedSignInPin).toBe(false);
    });

    it('takes Android’s back button as Not now', async () => {
      const { chooseAndConfirm, enableBiometrics, sessionStore } = await renderStage({
        device: FACE_ID,
      });
      await chooseAndConfirm(PIN);
      await screen.findByText(COPY.offer);

      await act(async () => {
        hardwareBack?.(BACK_PRESS);
      });

      await waitFor(() => {
        expect(sessionStore.getState().stage).toBe('ready');
      });
      expect(enableBiometrics).not.toHaveBeenCalled();
    });

    it('keeps the edge-swipe responder on the frame for iOS', async () => {
      const { chooseAndConfirm } = await renderStage({ device: FACE_ID });
      await chooseAndConfirm(PIN);
      await screen.findByText(COPY.offer);

      expect(hasResponder(screen.root)).toBe(true);
    });
  });

  describe('going back', () => {
    it('returns from the confirm step to the first', async () => {
      const { typeDigits, press } = await renderStage();
      await typeDigits(PIN);
      await press('Continue');

      await press('Back');

      expect(await screen.findByText(COPY.title)).toBeOnTheScreen();
    });

    it('steps back on Android’s back button, then declines from the first step', async () => {
      const { typeDigits, press, sessionStore } = await renderStage();
      await typeDigits(PIN);
      await press('Continue');

      await act(async () => {
        hardwareBack?.(BACK_PRESS);
      });
      expect(await screen.findByText(COPY.title)).toBeOnTheScreen();

      await act(async () => {
        hardwareBack?.(BACK_PRESS);
      });
      await waitFor(() => {
        expect(sessionStore.getState().stage).toBe('ready');
      });
    });

    it('puts the edge-swipe responder on the frame for iOS', async () => {
      await renderStage();

      expect(hasResponder(screen.root)).toBe(true);
    });
  });

  it('offers no text field for the PIN', async () => {
    await renderStage();

    expect(JSON.stringify(screen.toJSON())).not.toContain('"type":"TextInput"');
  });
});
