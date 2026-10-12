import { NavigationContainer, useNavigation } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { act, screen, userEvent } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { create } from 'zustand';
import { renderWithProviders } from '@/test/render-with-providers';
import { useRedrawOnReturn } from './use-redraw-on-return';

jest.useFakeTimers();

type Routes = { Under: undefined; Over: undefined };

const Stack = createNativeStackNavigator<Routes>();

const useVersion = create<{ version: number; bump: () => void }>((set) => ({
  version: 1,
  bump: () => {
    set((state) => ({ version: state.version + 1 }));
  },
}));

function Under() {
  const navigation = useNavigation<NativeStackNavigationProp<Routes>>();
  const version = useVersion((state) => state.version);
  const redraw = useRedrawOnReturn(version);

  return (
    <>
      <Text>{`drawn ${String(redraw)}`}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          navigation.navigate('Over');
        }}
      >
        <Text>open</Text>
      </Pressable>
    </>
  );
}

function Over() {
  const navigation = useNavigation();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        navigation.goBack();
      }}
    >
      <Text>back</Text>
    </Pressable>
  );
}

function renderStack() {
  return renderWithProviders(
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Under" component={Under} />
        <Stack.Screen name="Over" component={Over} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

beforeEach(() => {
  useVersion.setState({ version: 1 });
});

describe('useRedrawOnReturn', () => {
  it('redraws on return when the data moved on while the screen was covered', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderStack();
    expect(await screen.findByText('drawn 0')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'open' }));
    await act(async () => {
      useVersion.getState().bump();
      await Promise.resolve();
    });
    await user.press(await screen.findByRole('button', { name: 'back' }));

    expect(await screen.findByText('drawn 1')).toBeOnTheScreen();
  });

  it('does not redraw on return when nothing changed', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderStack();

    await user.press(await screen.findByRole('button', { name: 'open' }));
    await user.press(await screen.findByRole('button', { name: 'back' }));

    expect(await screen.findByText('drawn 0')).toBeOnTheScreen();
  });

  it('does not redraw for a change made while the screen is showing', async () => {
    await renderStack();
    expect(await screen.findByText('drawn 0')).toBeOnTheScreen();

    await act(async () => {
      useVersion.getState().bump();
      await Promise.resolve();
    });

    expect(screen.getByText('drawn 0')).toBeOnTheScreen();
  });
});
