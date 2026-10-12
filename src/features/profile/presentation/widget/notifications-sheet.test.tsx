import { AppState, Linking } from 'react-native';
import { act, screen, userEvent, waitFor } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { offline } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type {
  SettingsNotificationsPort,
  SettingsPermissionStatus,
} from '../../domain/port/settings-notifications-port';
import { NotificationsSheet } from './notifications-sheet';

jest.useFakeTimers();

const flags = { emailEnabled: true, inAppEnabled: false };

function port(overrides: Partial<SettingsNotificationsPort> = {}): SettingsNotificationsPort {
  return {
    read: () => Promise.resolve(ok(flags)),
    readPermission: () => Promise.resolve('granted' as const),
    setEmail: jest.fn(() => Promise.resolve(ok({ type: 'saved' as const }))),
    setInApp: jest.fn(() => Promise.resolve(ok({ type: 'saved' as const }))),
    ...overrides,
  };
}

function permissions(...answers: SettingsPermissionStatus[]) {
  let call = 0;

  return jest.fn(() =>
    Promise.resolve(answers[Math.min(call++, answers.length - 1)] ?? ('granted' as const)),
  );
}

async function renderSheet(settingsNotificationsPort = port(), { isOpen = true } = {}) {
  const user = userEvent.setup();

  await renderWithProviders(<NotificationsSheet isOpen={isOpen} onClose={jest.fn()} />, {
    container: createTestContainer({
      settingsNotificationsPort: asValue(settingsNotificationsPort),
    }),
  });

  return { user, settingsNotificationsPort };
}

async function renderLoadedSheet(settingsNotificationsPort = port()) {
  const rendered = await renderSheet(settingsNotificationsPort);

  await waitFor(async () => {
    expect(await screen.findByRole('switch', { name: 'Email' })).toBeEnabled();
  });

  return rendered;
}

function captureForeground() {
  let onChange: ((state: string) => void) | undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
    onChange = handler as (state: string) => void;

    return { remove: jest.fn() };
  });

  return async () => {
    await act(async () => {
      onChange?.('active');
      await Promise.resolve();
    });
  };
}

afterEach(async () => {
  await act(async () => {
    await jest.runOnlyPendingTimersAsync();
  });
  jest.restoreAllMocks();
});

describe('NotificationsSheet', () => {
  it('shows both rows with what they mean', async () => {
    await renderLoadedSheet();

    expect(screen.getByText('Email')).toBeOnTheScreen();
    expect(screen.getByText('In-app notifications')).toBeOnTheScreen();
    expect(screen.getByText(/on by default/)).toBeOnTheScreen();
  });

  it('reflects the flags the server holds', async () => {
    await renderLoadedSheet();

    expect(screen.getByRole('switch', { name: 'Email' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'In-app notifications' })).not.toBeChecked();
  });

  it('saves the email flag when it is toggled', async () => {
    const { user, settingsNotificationsPort } = await renderLoadedSheet();

    await user.press(screen.getByRole('switch', { name: 'Email' }));

    expect(settingsNotificationsPort.setEmail).toHaveBeenCalledWith(false);
  });

  it('saves in-app when it is toggled', async () => {
    const { user, settingsNotificationsPort } = await renderLoadedSheet();

    await user.press(screen.getByRole('switch', { name: 'In-app notifications' }));

    expect(settingsNotificationsPort.setInApp).toHaveBeenCalledWith(true);
  });

  it('reads nothing while it is closed', async () => {
    const read = jest.fn(() => Promise.resolve(ok(flags)));
    const readPermission = permissions('granted');

    await renderSheet(port({ read, readPermission }), { isOpen: false });

    expect(read).not.toHaveBeenCalled();
    expect(readPermission).not.toHaveBeenCalled();
  });

  describe('when the flags cannot be loaded', () => {
    it('says so in a toast that leaves, and keeps the rows inert', async () => {
      await renderSheet(port({ read: () => Promise.resolve(err(offline())) }));

      expect(
        await screen.findByText('We couldn’t load your notification settings'),
      ).toBeOnTheScreen();
      expect(screen.getByRole('switch', { name: 'Email' })).toBeDisabled();

      await act(async () => {
        jest.advanceTimersByTime(4_000);
      });

      expect(screen.queryByText('We couldn’t load your notification settings')).toBeNull();
      expect(screen.getByRole('switch', { name: 'Email' })).toBeDisabled();
    });

    it('retries the read when the sheet is opened again, instead of offering a retry button', async () => {
      const read = jest
        .fn<ReturnType<SettingsNotificationsPort['read']>, []>()
        .mockResolvedValueOnce(err(offline()))
        .mockResolvedValue(ok(flags));
      const sheet = (isOpen: boolean) => <NotificationsSheet isOpen={isOpen} onClose={jest.fn()} />;
      const view = await renderWithProviders(sheet(true), {
        container: createTestContainer({ settingsNotificationsPort: asValue(port({ read })) }),
      });
      expect(
        await screen.findByText('We couldn’t load your notification settings'),
      ).toBeOnTheScreen();

      await view.rerender(sheet(false));
      await view.rerender(sheet(true));

      await waitFor(() => {
        expect(screen.getByRole('switch', { name: 'Email' })).toBeEnabled();
      });
      expect(screen.queryByText('We couldn’t load your notification settings')).toBeNull();
    });

    it('still explains a blocked device and offers Settings', async () => {
      await renderSheet(
        port({
          read: () => Promise.resolve(err(offline())),
          readPermission: permissions('blocked'),
        }),
      );

      expect(await screen.findByText('Notifications are off for this device')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Open Settings' })).toBeOnTheScreen();
    });
  });

  describe('when a save fails', () => {
    it('says so in a toast that leaves, and keeps showing what the server holds', async () => {
      const { user } = await renderLoadedSheet(
        port({ setEmail: jest.fn(() => Promise.resolve(err(offline()))) }),
      );

      await user.press(screen.getByRole('switch', { name: 'Email' }));

      expect(await screen.findByText('We couldn’t save that change. Try again.')).toBeOnTheScreen();
      expect(screen.getByRole('switch', { name: 'Email' })).toBeChecked();

      await act(async () => {
        jest.advanceTimersByTime(4_000);
      });

      expect(screen.queryByText('We couldn’t save that change. Try again.')).toBeNull();
    });
  });

  it('holds both rows while a save is in flight, and marks only the saving one busy', async () => {
    let finish: (() => void) | undefined;
    const setEmail = jest.fn(
      () =>
        new Promise<Awaited<ReturnType<SettingsNotificationsPort['setEmail']>>>((resolve) => {
          finish = () => {
            resolve(ok({ type: 'saved' }));
          };
        }),
    );
    const { user } = await renderLoadedSheet(port({ setEmail }));

    await user.press(screen.getByRole('switch', { name: 'Email' }));

    expect(screen.getByRole('switch', { name: 'Email' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'In-app notifications' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Email' })).toBeBusy();
    expect(screen.getByRole('switch', { name: 'In-app notifications' })).not.toBeBusy();

    await act(async () => {
      finish?.();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByRole('switch', { name: 'Email' })).toBeEnabled();
    });
    expect(screen.getByRole('switch', { name: 'Email' })).not.toBeBusy();
  });

  describe('when the device will not show notifications', () => {
    it('explains a block as soon as it opens, and offers Settings', async () => {
      const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
      const { user } = await renderSheet(port({ readPermission: permissions('blocked') }));

      expect(await screen.findByText('Notifications are off for this device')).toBeOnTheScreen();

      await user.press(screen.getByRole('button', { name: 'Open Settings' }));

      expect(openSettings).toHaveBeenCalled();
    });

    it('explains a block the toggle discovered', async () => {
      const { user } = await renderLoadedSheet(
        port({
          readPermission: permissions('not-determined'),
          setInApp: jest.fn(() => Promise.resolve(ok({ type: 'blocked-in-settings' as const }))),
        }),
      );

      await user.press(screen.getByRole('switch', { name: 'In-app notifications' }));

      expect(await screen.findByRole('button', { name: 'Open Settings' })).toBeOnTheScreen();
    });

    it('says so when the prompt was refused', async () => {
      const { user } = await renderLoadedSheet(
        port({
          readPermission: permissions('not-determined'),
          setInApp: jest.fn(() => Promise.resolve(ok({ type: 'needs-permission' as const }))),
        }),
      );

      await user.press(screen.getByRole('switch', { name: 'In-app notifications' }));

      expect(await screen.findByText(/Notifications were not allowed/)).toBeOnTheScreen();
    });

    it('clears the explanation once the device allows them again', async () => {
      const foreground = captureForeground();
      await renderSheet(port({ readPermission: permissions('blocked', 'granted') }));

      expect(await screen.findByText('Notifications are off for this device')).toBeOnTheScreen();

      await foreground();

      await waitFor(() => {
        expect(screen.queryByText('Notifications are off for this device')).toBeNull();
      });
    });
  });

  it('re-reads the flags when the app comes back to the foreground', async () => {
    const foreground = captureForeground();
    const read = jest.fn(() => Promise.resolve(ok(flags)));
    await renderLoadedSheet(port({ read }));

    const before = read.mock.calls.length;

    await foreground();

    await waitFor(() => {
      expect(read.mock.calls.length).toBeGreaterThan(before);
    });
  });
});
