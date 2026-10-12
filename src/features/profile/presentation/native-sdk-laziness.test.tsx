import { Alert } from 'react-native';
import { asFunction } from 'awilix';
import { screen, userEvent } from '@testing-library/react-native';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { ProfileScreen } from './profile-screen';

jest.useFakeTimers();

const exploding = (name: string) =>
  asFunction(() => {
    throw new TypeError(`Cannot read property 'EventEmitter' of undefined (${name})`);
  }).singleton();

async function renderWithoutNativeModules() {
  return renderWithProviders(<ProfileScreen />, {
    withNavigation: true,
    container: createTestContainer({
      settingsPinPort: exploding('circle'),
      settingsVerificationPort: exploding('didit'),
      settingsSecurityPort: exploding('biometrics'),
    }),
  });
}

describe('opening settings on a device missing a native module', () => {
  it('still renders every row', async () => {
    await renderWithoutNativeModules();

    expect(await screen.findByRole('header', { name: 'Settings' })).toBeOnTheScreen();
    expect(screen.getByText('Change wallet PIN')).toBeOnTheScreen();
    expect(screen.getByText('Verification')).toBeOnTheScreen();
    expect(screen.getByText('Sign in with PIN')).toBeOnTheScreen();
    expect(screen.getByText('Biometric sign-in')).toBeOnTheScreen();
  });

  it('still opens the sheets that need no native module', async () => {
    await renderWithoutNativeModules();

    expect(await screen.findByText('Appearance')).toBeOnTheScreen();
    expect(screen.getByText('Currency')).toBeOnTheScreen();
  });

  it('leaves both sign-in switches off rather than guessing', async () => {
    await renderWithoutNativeModules();

    expect(await screen.findByRole('switch', { name: 'Sign in with PIN' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'Biometric sign-in' })).not.toBeChecked();
  });

  it('reports the failure on the row that needs it, without taking the screen down', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const user = userEvent.setup();
    await renderWithoutNativeModules();

    await user.press(await screen.findByText('Change wallet PIN'));

    expect(alertSpy).toHaveBeenCalled();
    expect(screen.getByRole('header', { name: 'Settings' })).toBeOnTheScreen();

    jest.restoreAllMocks();
  });
});
