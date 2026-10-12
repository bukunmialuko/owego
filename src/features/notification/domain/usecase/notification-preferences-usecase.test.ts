import { offline } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import type { PushPermissionStatus } from '../port/push-messaging-port';
import type { NotificationSettings } from '../repository/notification-settings-repository';
import { createNotificationPreferencesUseCase } from './notification-preferences-usecase';

function build({
  settings = { emailEnabled: true, inAppEnabled: false },
  status = 'granted',
  requestAnswer = 'granted',
  readFails = false,
  updateFails = false,
}: Partial<{
  settings: NotificationSettings;
  status: PushPermissionStatus;
  requestAnswer: PushPermissionStatus;
  readFails: boolean;
  updateFails: boolean;
}> = {}) {
  const read = jest.fn(() => Promise.resolve(readFails ? err(offline()) : ok(settings)));
  const update = jest.fn(() => Promise.resolve(updateFails ? err(offline()) : ok(undefined)));
  const requestPermission = jest.fn(() => Promise.resolve(requestAnswer));

  const usecase = createNotificationPreferencesUseCase({
    notificationSettingsRepository: { read, update },
    messaging: {
      getPermissionStatus: () => Promise.resolve(status),
      requestPermission,
    },
  });

  return { usecase, read, update, requestPermission };
}

describe('reading the preferences', () => {
  it.each([
    ['granted' as const, true, true],
    ['granted' as const, false, false],
    ['blocked' as const, true, false],
    ['denied' as const, true, false],
    ['not-determined' as const, true, false],
  ])('with OS %s and the server flag %p, in-app reads %p', async (status, flag, expected) => {
    const { usecase } = build({
      settings: { emailEnabled: true, inAppEnabled: flag },
      status,
    });

    await expect(usecase.read()).resolves.toEqual(
      ok({ emailEnabled: true, inAppEnabled: expected }),
    );
  });

  it('passes a failed read through', async () => {
    const { usecase } = build({ readFails: true });

    await expect(usecase.read()).resolves.toEqual(err(offline()));
  });

  it('reads the device permission without the server', async () => {
    const { usecase, read } = build({ status: 'blocked' });

    await expect(usecase.readPermission()).resolves.toBe('blocked');
    expect(read).not.toHaveBeenCalled();
  });
});

describe('turning in-app notifications on', () => {
  it('just saves when the OS already allows it', async () => {
    const { usecase, update, requestPermission } = build({ status: 'granted' });

    await expect(usecase.setInApp(true)).resolves.toEqual(ok({ type: 'saved' }));

    expect(requestPermission).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({ emailEnabled: true, inAppEnabled: true });
  });

  it.each(['not-determined' as const, 'denied' as const])(
    'asks the OS first when the permission is %s',
    async (status) => {
      const { usecase, update, requestPermission } = build({ status, requestAnswer: 'granted' });

      await expect(usecase.setInApp(true)).resolves.toEqual(ok({ type: 'saved' }));

      expect(requestPermission).toHaveBeenCalled();
      expect(update).toHaveBeenCalledWith({ emailEnabled: true, inAppEnabled: true });
    },
  );

  it('does not save when the OS prompt is refused', async () => {
    const { usecase, update } = build({ status: 'not-determined', requestAnswer: 'denied' });

    await expect(usecase.setInApp(true)).resolves.toEqual(ok({ type: 'needs-permission' }));

    expect(update).not.toHaveBeenCalled();
  });

  it('asks for Settings when the prompt answers that it is blocked', async () => {
    const { usecase, update } = build({ status: 'not-determined', requestAnswer: 'blocked' });

    await expect(usecase.setInApp(true)).resolves.toEqual(ok({ type: 'blocked-in-settings' }));

    expect(update).not.toHaveBeenCalled();
  });

  it('never re-prompts when blocked, and asks for Settings instead', async () => {
    const { usecase, update, requestPermission } = build({ status: 'blocked' });

    await expect(usecase.setInApp(true)).resolves.toEqual(ok({ type: 'blocked-in-settings' }));

    expect(requestPermission).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('asks for Settings even when the server cannot be read', async () => {
    const { usecase, read } = build({ status: 'blocked', readFails: true });

    await expect(usecase.setInApp(true)).resolves.toEqual(ok({ type: 'blocked-in-settings' }));

    expect(read).not.toHaveBeenCalled();
  });

  it('passes a failed server read through once the device allows it', async () => {
    const { usecase, update } = build({ status: 'granted', readFails: true });

    await expect(usecase.setInApp(true)).resolves.toEqual(err(offline()));

    expect(update).not.toHaveBeenCalled();
  });

  it('does not write a flag the server already holds', async () => {
    const { usecase, update } = build({
      settings: { emailEnabled: true, inAppEnabled: true },
      status: 'granted',
    });

    await expect(usecase.setInApp(true)).resolves.toEqual(ok({ type: 'saved' }));

    expect(update).not.toHaveBeenCalled();
  });
});

describe('turning things off', () => {
  it('turns in-app off without touching OS permission', async () => {
    const { usecase, update, requestPermission } = build({
      settings: { emailEnabled: true, inAppEnabled: true },
    });

    await expect(usecase.setInApp(false)).resolves.toEqual(ok({ type: 'saved' }));

    expect(update).toHaveBeenCalledWith({ emailEnabled: true, inAppEnabled: false });
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('saves the email flag on its own, with no permission involved', async () => {
    const { usecase, update, requestPermission } = build({ status: 'blocked' });

    await expect(usecase.setEmail(false)).resolves.toEqual(ok({ type: 'saved' }));

    expect(update).toHaveBeenCalledWith({ emailEnabled: false, inAppEnabled: false });
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('does not write an email flag the server already holds', async () => {
    const { usecase, update } = build({ settings: { emailEnabled: false, inAppEnabled: false } });

    await expect(usecase.setEmail(false)).resolves.toEqual(ok({ type: 'saved' }));

    expect(update).not.toHaveBeenCalled();
  });

  it('reports a failed save rather than pretending it stuck', async () => {
    const { usecase } = build({ updateFails: true });

    await expect(usecase.setEmail(false)).resolves.toEqual(err(offline()));
  });
});
