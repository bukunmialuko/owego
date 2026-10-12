import { offline } from '@/core/errors/app-error';
import type { HttpClient } from '@/core/network/http-client';
import { err, ok } from '@/core/result/result';
import { createNotificationSettingsRemoteDataSource } from './notification-settings-remote-datasource';

function build(response: unknown) {
  const get = jest.fn().mockResolvedValue(ok(response));
  const put = jest.fn().mockResolvedValue(ok(response));

  return {
    dataSource: createNotificationSettingsRemoteDataSource({ get, put } as unknown as HttpClient),
    get,
    put,
  };
}

describe('NotificationSettingsRemoteDataSource', () => {
  describe('endpoints', () => {
    it('reads the flags from /user/notification-preference', async () => {
      const { dataSource, get } = build({ data: { email: true, in_app: false } });

      await dataSource.read();

      expect(get).toHaveBeenCalledWith('/user/notification-preference');
    });

    it('writes both flags back to the same path', async () => {
      const { dataSource, put } = build({ data: { email: false, in_app: true } });

      await dataSource.update({ emailEnabled: false, inAppEnabled: true });

      expect(put).toHaveBeenCalledWith('/user/notification-preference', {
        email: false,
        in_app: true,
      });
    });
  });

  it('unwraps the envelope into the two flags', async () => {
    const { dataSource } = build({ data: { email: false, in_app: true }, error: false });

    await expect(dataSource.read()).resolves.toEqual(
      ok({ emailEnabled: false, inAppEnabled: true }),
    );
  });

  describe('failures', () => {
    it('hands a failed read back unchanged', async () => {
      const get = jest.fn().mockResolvedValue(err(offline()));
      const dataSource = createNotificationSettingsRemoteDataSource({
        get,
      } as unknown as HttpClient);

      await expect(dataSource.read()).resolves.toEqual(err(offline()));
    });

    it('hands a failed write back unchanged', async () => {
      const put = jest.fn().mockResolvedValue(err(offline()));
      const dataSource = createNotificationSettingsRemoteDataSource({
        put,
      } as unknown as HttpClient);

      await expect(dataSource.update({ emailEnabled: true, inAppEnabled: true })).resolves.toEqual(
        err(offline()),
      );
    });
  });
});
