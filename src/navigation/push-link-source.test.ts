import type { AppCradle } from '@/core/di/container';
import { createPushLinkSource } from './push-link-source';

type Port = AppCradle['pushMessagingPort'];

function fakePort(overrides: Partial<Port> = {}): Port {
  return {
    getPermissionStatus: () => Promise.resolve('granted' as const),
    requestPermission: () => Promise.resolve('granted' as const),
    getToken: () => Promise.resolve({ ok: true, value: 'fcm-1' }),
    onTokenRefresh: () => () => undefined,
    onForegroundMessage: () => () => undefined,
    getInitialMessage: () => Promise.resolve(undefined),
    onNotificationOpened: () => () => undefined,
    ...overrides,
  };
}

describe('createPushLinkSource', () => {
  it('turns the launching notification into the initial url', async () => {
    const source = createPushLinkSource(
      fakePort({
        getInitialMessage: () =>
          Promise.resolve({ title: 't', body: 'b', deepLink: 'owego://wealth' }),
      }),
    );

    await expect(source.getInitialURL()).resolves.toBe('owego://wealth');
  });

  it('has no initial url for a launch without a notification or without a link', async () => {
    await expect(createPushLinkSource(fakePort()).getInitialURL()).resolves.toBeUndefined();
    await expect(
      createPushLinkSource(
        fakePort({ getInitialMessage: () => Promise.resolve({ title: 't', body: 'b' }) }),
      ).getInitialURL(),
    ).resolves.toBeUndefined();
  });

  it('forwards the deep link of a tapped message and nothing for a message without one', () => {
    let tap: (message: { title: string; body: string; deepLink?: string }) => void = () =>
      undefined;
    const source = createPushLinkSource(
      fakePort({
        onNotificationOpened: (listener) => {
          tap = listener;
          return () => undefined;
        },
      }),
    );
    const delivered: string[] = [];
    source.subscribe((url) => delivered.push(url));

    tap({ title: 't', body: 'b', deepLink: 'owego://pay' });
    tap({ title: 't', body: 'b' });

    expect(delivered).toEqual(['owego://pay']);
  });

  it('hands back the port unsubscribe', () => {
    const stop = jest.fn();
    const source = createPushLinkSource(fakePort({ onNotificationOpened: () => stop }));

    expect(source.subscribe(() => undefined)).toBe(stop);
  });
});
