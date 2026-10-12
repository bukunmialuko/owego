import { parseNotificationSettings, toUpdateBody } from './notification-settings-model';

const stagingResponseWithIdsReplaced = {
  data: {
    id: 'preference-id',
    user_id: 'user-id',
    email: false,
    in_app: true,
    created_at: '2026-09-26T22:29:26.478706117Z',
    updated_at: '2026-09-26T22:29:26.478706117Z',
  },
  error: false,
};

describe('notificationSettingsSchema', () => {
  it('parses an empty payload as the row the server creates on first read', () => {
    const parsed = parseNotificationSettings({});

    expect(parsed).toEqual({ ok: true, value: { emailEnabled: true, inAppEnabled: false } });
  });

  it('reads the two flags out of the envelope and ignores the row around them', () => {
    const parsed = parseNotificationSettings(stagingResponseWithIdsReplaced);

    expect(parsed).toEqual({ ok: true, value: { emailEnabled: false, inAppEnabled: true } });
  });

  it('ignores v1’s field names, which went away with v1’s route', () => {
    const parsed = parseNotificationSettings({
      data: { email_notifications: false, in_app_notifications: true },
    });

    expect(parsed).toEqual({ ok: true, value: { emailEnabled: true, inAppEnabled: false } });
  });
});

describe('toUpdateBody', () => {
  it('writes the same two names it reads, and nothing else', () => {
    expect(toUpdateBody({ emailEnabled: false, inAppEnabled: true })).toEqual({
      email: false,
      in_app: true,
    });
  });
});
