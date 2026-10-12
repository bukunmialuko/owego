import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform, Text } from 'react-native';
import { screen, userEvent } from '@testing-library/react-native';
import type { AppStackParamList } from '@/navigation/param-list';
import { renderWithProviders } from '@/test/render-with-providers';
import { ReceiveMethodScreen } from './receive-method-screen';

const Stack = createNativeStackNavigator<AppStackParamList>();

function renderChooser() {
  return renderWithProviders(
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Receive" component={ReceiveMethodScreen} />
      <Stack.Screen name="DepositAddress" component={() => <Text>deposit address page</Text>} />
      <Stack.Screen
        name="ExternalWalletDeposit"
        component={() => <Text>external wallet deposit page</Text>}
      />
    </Stack.Navigator>,
    { withNavigation: true },
  );
}

jest.useFakeTimers();

function renderScreen() {
  return renderWithProviders(<ReceiveMethodScreen />, { withNavigation: true });
}

describe('ReceiveMethodScreen', () => {
  it('names the screen for a screen reader', async () => {
    await renderScreen();

    expect(await screen.findByRole('header', { name: 'Receive money' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });

  it('offers sharing a wallet address as the way to fund the balance', async () => {
    await renderChooser();

    await userEvent
      .setup()
      .press(
        await screen.findByRole('button', { name: 'Share your wallet address, QR code or text' }),
      );

    expect(await screen.findByText('deposit address page')).toBeTruthy();
  });

  it.each([
    ['Bank transfer', 'Not available yet'],
    ['Card, Apple Pay & Google Pay', 'Not available yet'],
    ['Cash App', 'Not available yet'],
    ['PayPal', 'Not available yet'],
  ])('lists %s, "%s", as coming soon rather than as a destination', async (title, detail) => {
    await renderScreen();

    expect(await screen.findByLabelText(`${title}, ${detail}`)).toBeTruthy();
    expect(screen.queryByRole('button', { name: new RegExp(`^${escape(title)}`) })).toBeNull();
  });

  describe('direct deposit from a Seeker wallet', () => {
    afterEach(() => {
      Platform.OS = 'ios';
    });

    it('opens the deposit from a wallet on this device, on android', async () => {
      Platform.OS = 'android';
      await renderChooser();

      await userEvent.setup().press(
        await screen.findByRole('button', {
          name: 'Direct deposit (Seeker), From a wallet already on this device',
        }),
      );

      expect(await screen.findByText('external wallet deposit page')).toBeTruthy();
    });

    it('is not listed on ios', async () => {
      await renderScreen();

      await screen.findByText('Coming soon');
      expect(screen.queryByText('Direct deposit (Seeker)')).toBeNull();
    });
  });
});

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
