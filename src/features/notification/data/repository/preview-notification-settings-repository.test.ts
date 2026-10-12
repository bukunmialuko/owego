import { ok } from '@/core/result/result';
import { createPreviewNotificationSettingsRepository } from './preview-notification-settings-repository';

describe('the preview notification settings', () => {
  it('starts where a new account does: email on, in-app off', async () => {
    await expect(createPreviewNotificationSettingsRepository().read()).resolves.toEqual(
      ok({ emailEnabled: true, inAppEnabled: false }),
    );
  });

  it('reads back what was last written', async () => {
    const repository = createPreviewNotificationSettingsRepository();

    await expect(repository.update({ emailEnabled: false, inAppEnabled: true })).resolves.toEqual(
      ok(undefined),
    );

    await expect(repository.read()).resolves.toEqual(
      ok({ emailEnabled: false, inAppEnabled: true }),
    );
  });
});
