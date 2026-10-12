import { toTransferChallenge, toTransferChallengeBody } from './transfer-challenge-mapper';

describe('transfer challenge mapper', () => {
  it('writes the request as the four fields the endpoint takes', () => {
    expect(
      toTransferChallengeBody({
        walletId: '00000000-0000-4000-8000-000000000002',
        tokenId: '00000000-0000-4000-8000-000000000001',
        destinationAddress: 'Gxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx8',
        amountMinor: 10,
      }),
    ).toEqual({
      wallet_id: '00000000-0000-4000-8000-000000000002',
      amount: '0.1',
      destination_address: 'Gxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx8',
      token_id: '00000000-0000-4000-8000-000000000001',
    });
  });

  it.each([
    [500, '5'],
    [1, '0.01'],
    [18216, '182.16'],
    [513, '5.13'],
  ])('writes %p cents as amount %p', (amountMinor, amount) => {
    expect(
      toTransferChallengeBody({
        walletId: 'w',
        tokenId: 't',
        destinationAddress: 'a',
        amountMinor,
      }).amount,
    ).toBe(amount);
  });

  it('reads the challenge into camelCase', () => {
    expect(
      toTransferChallenge({ challenge_id: 'c1', user_token: 'u1', encryption_key: 'k1' }),
    ).toEqual({ challengeId: 'c1', userToken: 'u1', encryptionKey: 'k1' });
  });
});
