import { parsePushMessage } from './push-message-model';

describe('pushMessageModel', () => {
  it('keeps the title, the body and an in-app deep link', () => {
    expect(
      parsePushMessage({
        notification: { title: 'Payout sent', body: 'Your transfer is on its way' },
        data: { deepLink: 'owego://wealth' },
      }),
    ).toEqual({
      notification: { title: 'Payout sent', body: 'Your transfer is on its way' },
      data: { deepLink: 'owego://wealth' },
    });
  });

  it.each([
    {},
    { notification: {} },
    { notification: { title: 'Only a title' } },
    { notification: { body: 'Only a body' } },
    { notification: { title: '   ', body: 'Blank title' } },
    null,
    'not even an object',
  ])('rejects a payload without both a title and a body: %p', (payload) => {
    expect(parsePushMessage(payload)).toBeUndefined();
  });

  it.each(['https://evil.example/pay', 'intent://scan#Intent;end', 'owego:no-slashes', 42])(
    'drops a deep link outside the app scheme but keeps the message: %p',
    (deepLink) => {
      const model = parsePushMessage({
        notification: { title: 't', body: 'b' },
        data: { deepLink },
      });

      expect(model?.notification).toEqual({ title: 't', body: 'b' });
      expect(model?.data?.deepLink).toBeUndefined();
    },
  );

  it('ignores everything else in the payload', () => {
    expect(
      parsePushMessage({
        messageId: 'm-1',
        notification: { title: 't', body: 'b', android: { channelId: 'other' } },
        data: { deepLink: 'owego://pay', amount: '100' },
      }),
    ).toEqual({ notification: { title: 't', body: 'b' }, data: { deepLink: 'owego://pay' } });
  });
});
