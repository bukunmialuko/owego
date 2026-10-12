import { mayHaveMovedMoney, type SendOutcome } from './send-outcome';

describe('mayHaveMovedMoney', () => {
  it.each<SendOutcome>([{ type: 'sent' }, { type: 'processing' }, { type: 'unconfirmed' }])(
    'is true for %o, which must end where no second Confirm is on offer',
    (outcome) => {
      expect(mayHaveMovedMoney(outcome)).toBe(true);
    },
  );

  it.each<SendOutcome>([
    { type: 'cancelled' },
    { type: 'notSent', reason: 'failed' },
    { type: 'notSent', reason: 'insufficientBalance' },
  ])('is false for %o, where nothing left the wallet', (outcome) => {
    expect(mayHaveMovedMoney(outcome)).toBe(false);
  });
});
