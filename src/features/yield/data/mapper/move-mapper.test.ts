import { toBroadcastStatus, toInitiation, toMoveBody } from './move-mapper';

describe('toMoveBody', () => {
  it('sends the amount in cents, the token and its mint', () => {
    expect(
      toMoveBody({ kind: 'deposit', amountMinor: 1_500, tokenSymbol: 'USDC', tokenMint: 'mint' }),
    ).toEqual({ amount: 1_500, token: 'USDC', token_id: 'mint' });
  });

  it.each([10.5, 0, -1])('refuses an amount of %p', (amountMinor) => {
    expect(() =>
      toMoveBody({ kind: 'deposit', amountMinor, tokenSymbol: 'USDC', tokenMint: 'mint' }),
    ).toThrow(RangeError);
  });
});

describe('toInitiation', () => {
  const DTO = { challenge_id: 'c', user_token: 'u', encryption_key: 'k', transaction_id: 't' };

  it('reads the challenge and the transaction it signs for', () => {
    expect(toInitiation(DTO)).toEqual({
      challenge: { challengeId: 'c', userToken: 'u', encryptionKey: 'k' },
      transactionId: 't',
    });
  });

  it.each(['challenge_id', 'user_token', 'encryption_key', 'transaction_id'] as const)(
    'refuses one with no %s',
    (field) => {
      expect(toInitiation({ ...DTO, [field]: '' })).toBeUndefined();
    },
  );
});

describe('toBroadcastStatus', () => {
  it.each([
    ['success', 'succeeded'],
    ['Successful', 'succeeded'],
    ['succeeded', 'succeeded'],
    ['confirmed', 'succeeded'],
    ['completed', 'succeeded'],
    ['pending', 'pending'],
    ['processing', 'pending'],
    ['submitted', 'pending'],
    ['failed', 'failed'],
    ['failure', 'failed'],
    ['error', 'unknown'],
    ['cancelled', 'unknown'],
    ['', 'unknown'],
  ])('reads %p as %p', (status, expected) => {
    expect(toBroadcastStatus({ status })).toBe(expected);
  });
});
