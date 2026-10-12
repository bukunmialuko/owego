import { mayHaveMovedMoney, type DepositNotSentReason } from './external-deposit';

describe('mayHaveMovedMoney', () => {
  it('holds once the wallet has broadcast the deposit', () => {
    expect(mayHaveMovedMoney({ type: 'submitted', signature: 'sig' })).toBe(true);
  });

  it('holds when the wallet was asked to send and the app cannot tell what it did', () => {
    expect(mayHaveMovedMoney({ type: 'unconfirmed' })).toBe(true);
  });

  it.each<DepositNotSentReason>([
    'declined',
    'notSubmitted',
    'authorizationExpired',
    'noWallet',
    'unreachable',
    'unsupported',
    'invalidRequest',
    'noDestination',
  ])('does not hold when the deposit was not sent: %s', (reason) => {
    expect(mayHaveMovedMoney({ type: 'notSent', reason })).toBe(false);
  });
});
