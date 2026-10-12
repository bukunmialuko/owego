import { toPushMessage } from './push-message-mapper';

describe('pushMessageMapper', () => {
  it('maps the title and body', () => {
    expect(toPushMessage({ notification: { title: 'Payout sent', body: 'Arriving now' } })).toEqual(
      {
        title: 'Payout sent',
        body: 'Arriving now',
      },
    );
  });

  it('leaves the deep link out when there is none', () => {
    const message = toPushMessage({ notification: { title: 't', body: 'b' }, data: {} });

    expect('deepLink' in message).toBe(false);
  });

  it('carries the deep link through', () => {
    expect(
      toPushMessage({
        notification: { title: 't', body: 'b' },
        data: { deepLink: 'owego://wealth' },
      }),
    ).toEqual({ title: 't', body: 'b', deepLink: 'owego://wealth' });
  });
});
