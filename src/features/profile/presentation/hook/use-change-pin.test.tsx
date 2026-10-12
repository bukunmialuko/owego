import { Alert } from 'react-native';
import { screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { serverError } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import { Button } from '@/shared/ui';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type { SettingsPinOutcome } from '../../domain/port/settings-pin-port';
import { useChangePin } from './use-change-pin';

jest.useFakeTimers();

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

function Harness() {
  const { start } = useChangePin();

  return (
    <Button
      label="Change pin"
      onPress={() => {
        void start();
      }}
    />
  );
}

async function renderHarness(changePin: jest.Mock) {
  const user = userEvent.setup();

  await renderWithProviders(<Harness />, {
    container: createTestContainer({ settingsPinPort: asValue({ changePin }) }),
  });

  return { user, changePin };
}

const press = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.press(await screen.findByRole('button', { name: 'Change pin' }));
};

function outcome(value: SettingsPinOutcome) {
  return jest.fn(() => Promise.resolve(ok(value)));
}

describe('useChangePin', () => {
  it('confirms a completed change', async () => {
    const { user } = await renderHarness(outcome({ type: 'changed' }));

    await press(user);

    expect(alertSpy).toHaveBeenCalledWith('Pin changed successfully');
  });

  it('says nothing at all when the user backs out', async () => {
    const { user } = await renderHarness(outcome({ type: 'cancelled' }));

    await press(user);

    expect(alertSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['expired' as const, 'This challenge expired. Please try again.'],
    ['failed' as const, 'Failed to change pin'],
  ])('reports a %s challenge in its own words', async (type, message) => {
    const { user } = await renderHarness(outcome({ type }));

    await press(user);

    expect(alertSpy).toHaveBeenCalledWith(message);
  });

  it('reports a challenge that could not be minted, without leaking the detail', async () => {
    const { user } = await renderHarness(
      jest.fn(() =>
        Promise.resolve(err(serverError(500, 'circle upstream 155201 at /wallet/pin'))),
      ),
    );

    await press(user);

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0]?.[0]).not.toContain('155201');
    expect(alertSpy.mock.calls[0]?.[0]).not.toContain('/wallet/pin');
  });

  it('does not start twice', async () => {
    let release: (() => void) | undefined;
    const changePin = jest.fn(
      () =>
        new Promise((resolve) => {
          release = () => {
            resolve(ok({ type: 'changed' as const }));
          };
        }),
    );
    const { user } = await renderHarness(changePin);

    await press(user);
    await press(user);
    release?.();

    expect(changePin).toHaveBeenCalledTimes(1);
  });
});
