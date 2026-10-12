import {
  AuthorizationStatus,
  getInitialNotification,
  getToken,
  hasPermission,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  requestPermission,
  setBackgroundMessageHandler,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';
import { ok } from '@/core/result/result';
import {
  createFirebaseMessagingAdapter,
  registerBackgroundMessageHandler,
} from './firebase-messaging-adapter';

const sdk = {
  getInitialNotification: jest.mocked(getInitialNotification),
  getToken: jest.mocked(getToken),
  hasPermission: jest.mocked(hasPermission),
  onMessage: jest.mocked(onMessage),
  onNotificationOpenedApp: jest.mocked(onNotificationOpenedApp),
  onTokenRefresh: jest.mocked(onTokenRefresh),
  requestPermission: jest.mocked(requestPermission),
  setBackgroundMessageHandler: jest.mocked(setBackgroundMessageHandler),
};

const adapter = createFirebaseMessagingAdapter();

beforeEach(() => {
  jest.clearAllMocks();
});

function onAndroidVersion(version: number) {
  jest.spyOn(Platform, 'Version', 'get').mockReturnValue(version);
}

function onAndroid(version: number) {
  const original = Platform.OS;

  beforeEach(() => {
    Platform.OS = 'android';
    onAndroidVersion(version);
  });

  afterEach(() => {
    Platform.OS = original;
    jest.restoreAllMocks();
  });
}

describe('FirebaseMessagingAdapter', () => {
  describe('getPermissionStatus', () => {
    it.each([
      [AuthorizationStatus.AUTHORIZED, 'granted'],
      [AuthorizationStatus.PROVISIONAL, 'granted'],
      [AuthorizationStatus.DENIED, 'blocked'],
      [AuthorizationStatus.NOT_DETERMINED, 'not-determined'],
    ])('reads %p as %p on iOS', async (status, expected) => {
      sdk.hasPermission.mockResolvedValueOnce(status);

      await expect(adapter.getPermissionStatus()).resolves.toBe(expected);
    });

    it('does not prompt', async () => {
      sdk.hasPermission.mockResolvedValueOnce(AuthorizationStatus.DENIED);

      await adapter.getPermissionStatus();

      expect(sdk.requestPermission).not.toHaveBeenCalled();
    });

    it('reports an unreadable status as undetermined', async () => {
      sdk.hasPermission.mockRejectedValueOnce(new Error('no native module'));

      await expect(adapter.getPermissionStatus()).resolves.toBe('not-determined');
    });

    describe('on Android', () => {
      onAndroid(33);

      it('reads notifications that are on as granted', async () => {
        sdk.hasPermission.mockResolvedValueOnce(AuthorizationStatus.AUTHORIZED);

        await expect(adapter.getPermissionStatus()).resolves.toBe('granted');
      });

      it('reads notifications that are off as undetermined from Android 13', async () => {
        sdk.hasPermission.mockResolvedValueOnce(AuthorizationStatus.DENIED);

        await expect(adapter.getPermissionStatus()).resolves.toBe('not-determined');
      });

      it('reads notifications that are off as blocked before Android 13', async () => {
        onAndroidVersion(32);
        sdk.hasPermission.mockResolvedValueOnce(AuthorizationStatus.DENIED);

        await expect(adapter.getPermissionStatus()).resolves.toBe('blocked');
      });
    });
  });

  describe('requestPermission', () => {
    it.each([
      [AuthorizationStatus.AUTHORIZED, 'granted'],
      [AuthorizationStatus.PROVISIONAL, 'granted'],
      [AuthorizationStatus.DENIED, 'blocked'],
      [AuthorizationStatus.NOT_DETERMINED, 'denied'],
    ])('reports authorization status %p as %p on iOS', async (status, expected) => {
      sdk.requestPermission.mockResolvedValueOnce(status);

      await expect(adapter.requestPermission()).resolves.toBe(expected);
    });

    it('reports a failed prompt as denied', async () => {
      sdk.requestPermission.mockRejectedValueOnce(new Error('no activity'));

      await expect(adapter.requestPermission()).resolves.toBe('denied');
    });

    it('never asks Android for a permission on iOS', async () => {
      const request = jest.spyOn(PermissionsAndroid, 'request');
      sdk.requestPermission.mockResolvedValueOnce(AuthorizationStatus.AUTHORIZED);

      await adapter.requestPermission();

      expect(request).not.toHaveBeenCalled();
    });

    describe('on Android 13 and later', () => {
      onAndroid(33);

      it.each([
        [PermissionsAndroid.RESULTS.GRANTED, 'granted'],
        [PermissionsAndroid.RESULTS.DENIED, 'denied'],
        [PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN, 'blocked'],
      ] as const)('reports %p as %p', async (result, expected) => {
        const request = jest.spyOn(PermissionsAndroid, 'request').mockResolvedValueOnce(result);

        await expect(adapter.requestPermission()).resolves.toBe(expected);
        expect(request).toHaveBeenCalledWith(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        expect(sdk.requestPermission).not.toHaveBeenCalled();
      });

      it('reports a request that could not be shown as denied', async () => {
        jest
          .spyOn(PermissionsAndroid, 'request')
          .mockRejectedValueOnce(new Error('E_INVALID_ACTIVITY'));

        await expect(adapter.requestPermission()).resolves.toBe('denied');
      });
    });

    describe('before Android 13', () => {
      onAndroid(32);

      it.each([
        [AuthorizationStatus.AUTHORIZED, 'granted'],
        [AuthorizationStatus.DENIED, 'blocked'],
      ])('reports notifications read as %p as %p without asking', async (status, expected) => {
        const request = jest.spyOn(PermissionsAndroid, 'request');
        sdk.hasPermission.mockResolvedValueOnce(status);

        await expect(adapter.requestPermission()).resolves.toBe(expected);
        expect(request).not.toHaveBeenCalled();
      });
    });
  });

  describe('getToken', () => {
    it('returns the token the sdk produced', async () => {
      sdk.getToken.mockResolvedValueOnce('fcm-abc');

      await expect(adapter.getToken()).resolves.toEqual(ok('fcm-abc'));
    });

    it('reports an error when the sdk cannot produce one', async () => {
      sdk.getToken.mockRejectedValueOnce(new Error('SERVICE_NOT_AVAILABLE'));

      const result = await adapter.getToken();

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected the sdk failure to surface as an error');
      expect(result.error.detail).toMatch(/token/i);
    });
  });

  it('forwards token refreshes and hands back the sdk unsubscribe', () => {
    const unsubscribe = jest.fn();
    sdk.onTokenRefresh.mockImplementationOnce((_messaging, listener) => {
      listener('fcm-rotated');
      return unsubscribe;
    });
    const listener = jest.fn();

    expect(adapter.onTokenRefresh(listener)).toBe(unsubscribe);
    expect(listener).toHaveBeenCalledWith('fcm-rotated');
  });

  describe('onForegroundMessage', () => {
    function deliver(remote: RemoteMessage) {
      const listener = jest.fn();
      sdk.onMessage.mockImplementationOnce((_messaging, handler) => {
        handler(remote);
        return () => undefined;
      });
      adapter.onForegroundMessage(listener);
      return listener;
    }

    it('parses a displayable message and its deep link', () => {
      const listener = deliver({
        notification: { title: 'Payout sent', body: 'Arriving now' },
        data: { deepLink: 'owego://wealth' },
      });

      expect(listener).toHaveBeenCalledWith({
        title: 'Payout sent',
        body: 'Arriving now',
        deepLink: 'owego://wealth',
      });
    });

    it('drops a message with nothing to show', () => {
      const listener = deliver({ data: { silent: '1' } });

      expect(listener).not.toHaveBeenCalled();
    });

    it('drops a deep link outside the app scheme but still shows the message', () => {
      const listener = deliver({
        notification: { title: 't', body: 'b' },
        data: { deepLink: 'https://evil.example/pay' },
      });

      expect(listener).toHaveBeenCalledWith({ title: 't', body: 'b' });
    });

    it('hands back the sdk unsubscribe', () => {
      const unsubscribe = jest.fn();
      sdk.onMessage.mockReturnValueOnce(unsubscribe);

      expect(adapter.onForegroundMessage(jest.fn())).toBe(unsubscribe);
    });
  });

  describe('getInitialMessage', () => {
    it('is empty when the app was not launched from a notification', async () => {
      sdk.getInitialNotification.mockResolvedValueOnce(null);

      await expect(adapter.getInitialMessage()).resolves.toBeUndefined();
    });

    it('parses the notification the app was launched from', async () => {
      sdk.getInitialNotification.mockResolvedValueOnce({
        notification: { title: 'Payout sent', body: 'Arriving now' },
        data: { deepLink: 'owego://wealth' },
      });

      await expect(adapter.getInitialMessage()).resolves.toEqual({
        title: 'Payout sent',
        body: 'Arriving now',
        deepLink: 'owego://wealth',
      });
    });

    it('is empty when the sdk cannot answer', async () => {
      sdk.getInitialNotification.mockRejectedValueOnce(new Error('not ready'));

      await expect(adapter.getInitialMessage()).resolves.toBeUndefined();
    });
  });

  describe('onNotificationOpened', () => {
    function tap(remote: RemoteMessage) {
      const listener = jest.fn();
      sdk.onNotificationOpenedApp.mockImplementationOnce((_messaging, handler) => {
        handler(remote);
        return () => undefined;
      });
      adapter.onNotificationOpened(listener);
      return listener;
    }

    it('forwards the tapped message with its validated deep link', () => {
      const listener = tap({
        notification: { title: 'Sign-in', body: 'Confirm it was you' },
        data: { deepLink: 'owego://' },
      });

      expect(listener).toHaveBeenCalledWith({
        title: 'Sign-in',
        body: 'Confirm it was you',
        deepLink: 'owego://',
      });
    });

    it('drops a tap it cannot parse', () => {
      const listener = tap({ data: { deepLink: 'owego://pay' } });

      expect(listener).not.toHaveBeenCalled();
    });

    it('hands back the sdk unsubscribe', () => {
      const unsubscribe = jest.fn();
      sdk.onNotificationOpenedApp.mockReturnValueOnce(unsubscribe);

      expect(adapter.onNotificationOpened(jest.fn())).toBe(unsubscribe);
    });
  });

  it('registers an intentional no-op background handler', async () => {
    registerBackgroundMessageHandler();

    expect(sdk.setBackgroundMessageHandler).toHaveBeenCalledTimes(1);
    const handler = sdk.setBackgroundMessageHandler.mock.calls[0]?.[1];
    await expect(handler?.({})).resolves.toBeUndefined();
  });

  it('never writes to the console, even on failure', async () => {
    const spies = (['log', 'warn', 'error'] as const).map((method) =>
      jest.spyOn(console, method).mockImplementation(() => undefined),
    );
    sdk.getToken.mockRejectedValueOnce(new Error('boom'));
    sdk.requestPermission.mockRejectedValueOnce(new Error('boom'));

    await adapter.getToken();
    await adapter.requestPermission();

    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    }
  });
});
