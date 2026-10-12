import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { Pressable, Text } from 'react-native';
import { isAppError } from '@/core/errors/app-error';
import type { Telemetry } from '@/core/observability/telemetry';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type { AppStackParamList, TabParamList } from './param-list';
import { appScreenLayout, tabScreenLayout } from './screen-error-boundary';

const Stack = createNativeStackNavigator<AppStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function Explodes(): never {
  throw new Error('render failed');
}

function HomeTab() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  return (
    <>
      <Text>Home tab</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          navigation.navigate('SendAsset');
        }}
      >
        <Text>Send</Text>
      </Pressable>
    </>
  );
}

function WealthTab() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        navigation.navigate('SendAsset');
      }}
    >
      <Text>Send from wealth</Text>
    </Pressable>
  );
}

function recordingTelemetry() {
  const captureError = jest.fn<void, Parameters<Telemetry['captureError']>>();

  return { telemetry: { captureError, track: jest.fn(), identify: jest.fn() }, captureError };
}

async function renderApp({
  firstTab = 'Home',
  wealth = WealthTab,
  telemetry = recordingTelemetry().telemetry,
}: {
  firstTab?: keyof TabParamList;
  wealth?: () => React.ReactElement;
  telemetry?: Telemetry;
} = {}) {
  function Tabs() {
    return (
      <Tab.Navigator initialRouteName={firstTab} screenLayout={tabScreenLayout}>
        <Tab.Screen name="Home" component={HomeTab} />
        <Tab.Screen name="Wealth" component={wealth} />
        <Tab.Screen name="Travel" component={HomeTab} />
      </Tab.Navigator>
    );
  }

  await renderWithProviders(
    <Stack.Navigator screenOptions={{ headerShown: false }} screenLayout={appScreenLayout}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen name="SendAsset" component={Explodes} />
    </Stack.Navigator>,
    { withNavigation: true, container: createTestContainer({ telemetry: asValue(telemetry) }) },
  );
}

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('a page that fails to render', () => {
  it('costs that page, not the app, and says so', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.press(await screen.findByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Something went wrong')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Back to home' })).toBeOnTheScreen();
  });

  it('goes back to the home tab, with nothing above it', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.press(await screen.findByRole('button', { name: 'Send' }));
    await user.press(await screen.findByRole('button', { name: 'Back to home' }));

    expect(await screen.findByText('Home tab')).toBeOnTheScreen();
    expect(screen.queryByText('Something went wrong')).not.toBeOnTheScreen();
  });

  it('lands on home even when it was opened from another tab', async () => {
    const user = userEvent.setup();
    await renderApp({ firstTab: 'Wealth' });

    await user.press(await screen.findByRole('button', { name: 'Send from wealth' }));
    await user.press(await screen.findByRole('button', { name: 'Back to home' }));

    expect(await screen.findByText('Home tab')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Send from wealth' })).not.toBeOnTheScreen();
  });

  it('reports which page failed', async () => {
    const user = userEvent.setup();
    const { telemetry, captureError } = recordingTelemetry();
    await renderApp({ telemetry });

    await user.press(await screen.findByRole('button', { name: 'Send' }));
    await screen.findByText('Something went wrong');

    expect(captureError).toHaveBeenCalledTimes(1);
    const [error, context] = captureError.mock.calls[0] ?? [];
    expect(isAppError(error)).toBe(true);
    expect(context).toEqual({ route: 'SendAsset' });
  });
});

describe('a tab that fails to render', () => {
  it('goes back to the home tab, and draws the failed tab afresh next time', async () => {
    const user = userEvent.setup();
    let wealthFails = true;
    function FlakyWealth() {
      if (wealthFails) throw new Error('render failed');

      return <Text>Wealth tab</Text>;
    }
    await renderApp({ firstTab: 'Wealth', wealth: FlakyWealth });

    await user.press(await screen.findByRole('button', { name: 'Back to home' }));
    expect(await screen.findByText('Home tab')).toBeOnTheScreen();

    wealthFails = false;
    await user.press(screen.getByRole('button', { name: /Wealth/ }));

    expect(await screen.findByText('Wealth tab')).toBeOnTheScreen();
  });

  it('draws home again in place when home itself failed', async () => {
    const user = userEvent.setup();
    let homeFails = true;
    function FlakyHome() {
      if (homeFails) throw new Error('render failed');

      return <Text>Home again</Text>;
    }

    function Tabs() {
      return (
        <Tab.Navigator screenLayout={tabScreenLayout}>
          <Tab.Screen name="Home" component={FlakyHome} />
          <Tab.Screen name="Wealth" component={WealthTab} />
          <Tab.Screen name="Travel" component={WealthTab} />
        </Tab.Navigator>
      );
    }
    await renderWithProviders(
      <Stack.Navigator screenOptions={{ headerShown: false }} screenLayout={appScreenLayout}>
        <Stack.Screen name="Tabs" component={Tabs} />
      </Stack.Navigator>,
      { withNavigation: true },
    );

    homeFails = false;
    await user.press(await screen.findByRole('button', { name: 'Back to home' }));

    expect(await screen.findByText('Home again')).toBeOnTheScreen();
  });
});
