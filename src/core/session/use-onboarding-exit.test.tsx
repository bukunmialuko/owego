import { BackHandler } from 'react-native';
import { act, screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { View } from 'react-native';
import { Button, Text } from '@/shared/ui';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { createSessionStore, type SessionUser } from './session-store';
import { useOnboardingExit } from './use-onboarding-exit';
import { KycState } from '@/core/session/onboarding-gate';

jest.useFakeTimers();

const USER: SessionUser = { id: 'u1', firstName: 'Ada', kycState: KycState.Approved };

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

function Harness() {
  const exit = useOnboardingExit();

  return (
    <>
      <Text>{exit.isConfirmOpen ? 'confirm open' : 'confirm closed'}</Text>
      <View testID="frame" {...exit.panHandlers} />
      <Button
        label="Leave"
        onPress={() => {
          void exit.confirmExit();
        }}
      />
    </>
  );
}

async function renderHarness() {
  const sessionStore = createSessionStore();
  sessionStore.getState().signedIn(USER, 'kyc');

  const container = createTestContainer({ sessionStore: asValue(sessionStore) });
  await renderWithProviders(<Harness />, { container });

  return { sessionStore };
}

describe('useOnboardingExit', () => {
  it('opens the confirmation on a hardware back press', async () => {
    await renderHarness();

    expect(screen.getByText('confirm closed')).toBeTruthy();

    await act(async () => {
      hardwareBack?.(BACK_PRESS);
    });

    expect(screen.getByText('confirm open')).toBeTruthy();
  });

  it('reports the back press as handled', async () => {
    await renderHarness();
    let handled: boolean | null | undefined;

    await act(async () => {
      handled = hardwareBack?.(BACK_PRESS);
    });

    expect(handled).toBe(true);
  });

  it('signs the user out when the exit is confirmed', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { sessionStore } = await renderHarness();

    await user.press(screen.getByRole('button', { name: 'Leave' }));

    expect(sessionStore.getState().status).toBe('unauthenticated');
  });

  it('supplies pan handlers for the ios edge swipe', async () => {
    await renderHarness();

    const frame = screen.getByTestId('frame').props as Record<string, unknown>;

    expect(frame['onMoveShouldSetResponder']).toEqual(expect.any(Function));
    expect(frame['onResponderRelease']).toEqual(expect.any(Function));
  });

  it('closes the confirmation as it goes', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderHarness();

    await act(async () => {
      hardwareBack?.(BACK_PRESS);
    });
    await user.press(screen.getByRole('button', { name: 'Leave' }));

    expect(await screen.findByText('confirm closed')).toBeTruthy();
  });
});
