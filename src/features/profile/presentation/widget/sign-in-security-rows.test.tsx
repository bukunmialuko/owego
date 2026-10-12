import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { unknownError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type {
  SettingsBiometricDevice,
  SettingsSecurity,
  SettingsSecurityPort,
} from '../../domain/port/settings-security-port';
import { SignInPinScreen } from '../sign-in-pin-screen';
import { SignInSecurityRows } from './sign-in-security-rows';

jest.useFakeTimers();

const PIN = '1357';
const PIN_SWITCH = 'Sign in with PIN';
const BIOMETRIC_SWITCH = 'Biometric sign-in';
const FACE_ID: SettingsBiometricDevice = { type: 'available', kind: 'face-id' };

const COPY = {
  needsPin: 'Turn on sign in with PIN first.',
  unavailable: 'This device can’t use biometric sign-in.',
  notEnrolled: 'Set up Face ID or a fingerprint in your phone’s settings first.',
  offer: 'Use Face ID to get back in?',
  enterPin: 'Enter your PIN',
  enableBiometrics: 'Enter your sign-in PIN to turn on biometric sign-in.',
  disablePin: 'Confirm it’s you to turn off sign in with PIN.',
  wrongPin: 'That PIN didn’t match.',
  couldNotEnable: 'Biometric sign-in couldn’t be turned on. Try again.',
  unknown: 'Something went wrong. Please try again.',
} as const;

type Answer<K extends keyof SettingsSecurityPort> = Awaited<ReturnType<SettingsSecurityPort[K]>>;

function statefulPort(
  initial: Partial<SettingsSecurity> = {},
  answers: {
    enablePin?: Answer<'enablePin'>;
    disablePin?: (challenge: { pin?: string }) => Answer<'disablePin'>;
    enableBiometrics?: Answer<'enableBiometrics'>;
  } = {},
) {
  let state: SettingsSecurity = { pin: false, biometrics: false, device: FACE_ID, ...initial };
  const settle = <T,>(answer: Result<T, AppError>, onSuccess: () => void) => {
    if (answer.ok) onSuccess();
    return Promise.resolve(answer);
  };

  const port = {
    read: () => Promise.resolve(state),
    enablePin: jest.fn((_pin: string) => {
      const answer = answers.enablePin ?? ok({ type: 'enabled' });
      return settle(answer, () => {
        if (answer.ok && answer.value.type === 'enabled') state = { ...state, pin: true };
      });
    }),
    disablePin: jest.fn((challenge: { pin?: string }) => {
      const answer =
        answers.disablePin?.(challenge) ??
        (challenge.pin === undefined || challenge.pin === PIN
          ? ok({ type: 'disabled' as const })
          : ok({ type: 'challenge-failed' as const }));
      return settle(answer, () => {
        if (answer.ok && answer.value.type === 'disabled') {
          state = { ...state, pin: false, biometrics: false };
        }
      });
    }),
    enableBiometrics: jest.fn((_pin: string) => {
      const answer = answers.enableBiometrics ?? ok({ type: 'enabled' });
      return settle(answer, () => {
        if (answer.ok && answer.value.type === 'enabled') state = { ...state, biometrics: true };
      });
    }),
    disableBiometrics: jest.fn(() => {
      state = { ...state, biometrics: false };
      return Promise.resolve(ok({ type: 'disabled' as const }));
    }),
  } satisfies SettingsSecurityPort;

  return port;
}

const Stack = createNativeStackNavigator();

function Settings() {
  return <SignInSecurityRows />;
}

async function renderSettings(port: SettingsSecurityPort) {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

  await renderWithProviders(
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Settings" component={Settings} />
        <Stack.Screen name="SignInPin" component={SignInPinScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
    { container: createTestContainer({ settingsSecurityPort: asValue(port) }) },
  );

  const press = async (name: string) => {
    await user.press(await screen.findByRole('button', { name }));
  };
  const typeDigits = async (digits: string) => {
    for (const digit of digits) await press(digit);
  };

  return {
    press,
    typeDigits,
    toggle: async (name: string) => {
      await user.press(await screen.findByRole('switch', { name }));
    },
    chooseAndConfirm: async (first: string, second = first) => {
      await typeDigits(first);
      await press('Continue');
      await typeDigits(second);
      await press('Continue');
    },
    enterPin: async (pin: string) => {
      await typeDigits(pin);
      await press('Continue');
    },
  };
}

async function expectSwitch(name: string, checked: boolean) {
  await waitFor(() => {
    const control = screen.getByRole('switch', { name });
    if (checked) expect(control).toBeChecked();
    else expect(control).not.toBeChecked();
  });
}

describe('SignInSecurityRows', () => {
  it('shows both off on a fresh install, holding biometrics until PIN sign-in is on', async () => {
    await renderSettings(statefulPort());

    await expectSwitch(PIN_SWITCH, false);
    expect(await screen.findByText(COPY.needsPin)).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: BIOMETRIC_SWITCH })).toBeDisabled();
  });

  it('reflects PIN sign-in and biometrics already on', async () => {
    await renderSettings(statefulPort({ pin: true, biometrics: true }));

    await expectSwitch(PIN_SWITCH, true);
    await expectSwitch(BIOMETRIC_SWITCH, true);
  });

  describe('turning PIN sign-in on', () => {
    it('asks for a new PIN and confirms it before enabling anything', async () => {
      const port = statefulPort();
      const flow = await renderSettings(port);
      await flow.toggle(PIN_SWITCH);

      expect(await screen.findByText('Create a PIN')).toBeOnTheScreen();
      await flow.enterPin(PIN);

      expect(await screen.findByText('Confirm PIN')).toBeOnTheScreen();
      expect(port.enablePin).not.toHaveBeenCalled();
    });

    it('clears the entry and says so when the two PINs differ', async () => {
      const port = statefulPort();
      const flow = await renderSettings(port);
      await flow.toggle(PIN_SWITCH);

      await flow.chooseAndConfirm(PIN, '2468');

      expect(await screen.findByText('Those PINs didn’t match. Try again.')).toBeOnTheScreen();
      expect(port.enablePin).not.toHaveBeenCalled();
    });

    it('says why a guessable PIN was refused and starts over', async () => {
      const flow = await renderSettings(
        statefulPort({}, { enablePin: ok({ type: 'rejected', problem: 'repeated' }) }),
      );
      await flow.toggle(PIN_SWITCH);

      await flow.chooseAndConfirm('1111');

      expect(await screen.findByText('Don’t repeat the same digit.')).toBeOnTheScreen();
      expect(screen.getByText('Create a PIN')).toBeOnTheScreen();
    });

    it('says something went wrong when enabling fails outright', async () => {
      const flow = await renderSettings(
        statefulPort({}, { enablePin: err(unknownError('keychain')) }),
      );
      await flow.toggle(PIN_SWITCH);

      await flow.chooseAndConfirm(PIN);

      expect(await screen.findByText(COPY.unknown)).toBeOnTheScreen();
    });

    it('offers Face ID once the PIN is set, and returns with both on when accepted', async () => {
      const port = statefulPort();
      const flow = await renderSettings(port);
      await flow.toggle(PIN_SWITCH);
      await flow.chooseAndConfirm(PIN);

      expect(await screen.findByText(COPY.offer)).toBeOnTheScreen();
      await flow.press('Use Face ID');

      expect(port.enablePin).toHaveBeenCalledWith(PIN);
      expect(port.enableBiometrics).toHaveBeenCalledWith(PIN);
      await expectSwitch(PIN_SWITCH, true);
      await expectSwitch(BIOMETRIC_SWITCH, true);
    });

    it('returns with PIN on and biometrics off when the offer is declined', async () => {
      const port = statefulPort();
      const flow = await renderSettings(port);
      await flow.toggle(PIN_SWITCH);
      await flow.chooseAndConfirm(PIN);

      await flow.press('Not now');

      expect(port.enableBiometrics).not.toHaveBeenCalled();
      await expectSwitch(PIN_SWITCH, true);
      await expectSwitch(BIOMETRIC_SWITCH, false);
    });

    it.each<[string, Answer<'enableBiometrics'>]>([
      ['is dismissed', ok({ type: 'not-enabled', reason: 'cancelled' })],
      ['fails outright', err(unknownError('lockout'))],
    ])('returns with PIN on when the offer’s prompt %s', async (_label, answer) => {
      const flow = await renderSettings(statefulPort({}, { enableBiometrics: answer }));
      await flow.toggle(PIN_SWITCH);
      await flow.chooseAndConfirm(PIN);

      await flow.press('Use Face ID');

      await expectSwitch(PIN_SWITCH, true);
      await expectSwitch(BIOMETRIC_SWITCH, false);
    });

    it('makes no offer on a device without usable biometrics', async () => {
      const port = statefulPort({ device: { type: 'unavailable' } });
      const flow = await renderSettings(port);
      await flow.toggle(PIN_SWITCH);

      await flow.chooseAndConfirm(PIN);

      await expectSwitch(PIN_SWITCH, true);
      expect(screen.queryByText(COPY.offer)).not.toBeOnTheScreen();
    });

    it('leaves the switch off when the user backs out', async () => {
      const flow = await renderSettings(statefulPort());
      await flow.toggle(PIN_SWITCH);
      await flow.enterPin(PIN);

      await flow.press('Back');
      expect(await screen.findByText('Create a PIN')).toBeOnTheScreen();
      await flow.press('Back');

      await expectSwitch(PIN_SWITCH, false);
    });
  });

  describe('turning PIN sign-in off', () => {
    it('asks for the current PIN, with no prompt, while biometrics are off', async () => {
      const port = statefulPort({ pin: true });
      const flow = await renderSettings(port);

      await flow.toggle(PIN_SWITCH);
      expect(await screen.findByText(COPY.enterPin)).toBeOnTheScreen();
      expect(screen.getByText(COPY.disablePin)).toBeOnTheScreen();
      expect(port.disablePin).not.toHaveBeenCalled();

      await flow.enterPin(PIN);

      expect(port.disablePin).toHaveBeenCalledWith({ pin: PIN });
      await expectSwitch(PIN_SWITCH, false);
    });

    it('proves it with biometrics first while they are on, needing no pad', async () => {
      const port = statefulPort({ pin: true, biometrics: true });
      const flow = await renderSettings(port);

      await flow.toggle(PIN_SWITCH);

      expect(port.disablePin).toHaveBeenCalledWith({});
      await expectSwitch(PIN_SWITCH, false);
      await expectSwitch(BIOMETRIC_SWITCH, false);
      expect(screen.queryByText(COPY.enterPin)).not.toBeOnTheScreen();
    });

    it('falls back to the current PIN when biometrics are refused', async () => {
      const port = statefulPort(
        { pin: true, biometrics: true },
        {
          disablePin: (challenge) =>
            challenge.pin === PIN ? ok({ type: 'disabled' }) : ok({ type: 'challenge-failed' }),
        },
      );
      const flow = await renderSettings(port);

      await flow.toggle(PIN_SWITCH);
      expect(await screen.findByText(COPY.enterPin)).toBeOnTheScreen();
      await flow.enterPin(PIN);

      expect(port.disablePin).toHaveBeenLastCalledWith({ pin: PIN });
      await expectSwitch(PIN_SWITCH, false);
    });

    it('says a wrong current PIN did not match, and stays on', async () => {
      const flow = await renderSettings(statefulPort({ pin: true }));

      await flow.toggle(PIN_SWITCH);
      await flow.enterPin('0000');

      expect(await screen.findByText(COPY.wrongPin)).toBeOnTheScreen();
      await flow.press('Back');
      await expectSwitch(PIN_SWITCH, true);
    });
  });

  describe('biometric sign-in', () => {
    it.each<[string, SettingsBiometricDevice, string]>([
      ['has no usable sensor', { type: 'unavailable' }, COPY.unavailable],
      ['has nothing enrolled', { type: 'not-enrolled' }, COPY.notEnrolled],
    ])('is held, saying why, on a device that %s', async (_label, device, helper) => {
      await renderSettings(statefulPort({ pin: true, device }));

      expect(await screen.findByText(helper)).toBeOnTheScreen();
      expect(screen.getByRole('switch', { name: BIOMETRIC_SWITCH })).toBeDisabled();
    });

    it('turns on after the current PIN and one prompt', async () => {
      const port = statefulPort({ pin: true });
      const flow = await renderSettings(port);

      await flow.toggle(BIOMETRIC_SWITCH);
      expect(await screen.findByText(COPY.enableBiometrics)).toBeOnTheScreen();
      await flow.enterPin(PIN);

      expect(port.enableBiometrics).toHaveBeenCalledWith(PIN);
      await expectSwitch(BIOMETRIC_SWITCH, true);
    });

    it('says a wrong PIN did not match', async () => {
      const flow = await renderSettings(
        statefulPort({ pin: true }, { enableBiometrics: ok({ type: 'wrong-pin' }) }),
      );

      await flow.toggle(BIOMETRIC_SWITCH);
      await flow.enterPin('2468');

      expect(await screen.findByText(COPY.wrongPin)).toBeOnTheScreen();
    });

    it('stays on the pad, saying nothing, when the prompt is dismissed', async () => {
      const flow = await renderSettings(
        statefulPort(
          { pin: true },
          { enableBiometrics: ok({ type: 'not-enabled', reason: 'cancelled' }) },
        ),
      );

      await flow.toggle(BIOMETRIC_SWITCH);
      await flow.enterPin(PIN);

      expect(await screen.findByText(COPY.enableBiometrics)).toBeOnTheScreen();
      expect(screen.queryByText(COPY.wrongPin)).not.toBeOnTheScreen();
      expect(screen.queryByText(COPY.couldNotEnable)).not.toBeOnTheScreen();
    });

    it('says it could not be turned on when the prompt fails outright', async () => {
      const flow = await renderSettings(
        statefulPort({ pin: true }, { enableBiometrics: err(unknownError('lockout')) }),
      );

      await flow.toggle(BIOMETRIC_SWITCH);
      await flow.enterPin(PIN);

      expect(await screen.findByText(COPY.couldNotEnable)).toBeOnTheScreen();
    });

    it('turns off at once, with no challenge', async () => {
      const port = statefulPort({ pin: true, biometrics: true });
      const flow = await renderSettings(port);

      await flow.toggle(BIOMETRIC_SWITCH);

      expect(port.disableBiometrics).toHaveBeenCalled();
      await expectSwitch(BIOMETRIC_SWITCH, false);
      await expectSwitch(PIN_SWITCH, true);
      expect(screen.queryByText(COPY.enterPin)).not.toBeOnTheScreen();
    });
  });
});
