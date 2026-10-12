import { walletChallengeSchema, walletSchema } from '../model/wallet-model';
import { toWallet, toWalletChallenge } from './wallet-mapper';

describe('toWallet', () => {
  it('keeps the balance amount as the string the api sent', () => {
    const wallet = toWallet(
      walletSchema.parse({
        id: 'w1',
        address: '4k3D',
        balances: [{ token_id: 'usdc', symbol: 'USDC', amount: '5136.98', decimals: 6 }],
      }),
    );

    expect(wallet.balances[0]).toEqual({
      tokenId: 'usdc',
      symbol: 'USDC',
      amount: '5136.98',
      decimals: 6,
    });
  });

  it('maps a wallet with no balances', () => {
    expect(toWallet(walletSchema.parse({ id: 'w1' })).balances).toEqual([]);
  });
});

describe('toWalletChallenge', () => {
  it('renames each snake_case key onto the domain shape', () => {
    const challenge = toWalletChallenge(
      walletChallengeSchema.parse({
        challenge_id: 'c1',
        user_token: 'u1',
        encryption_key: 'k1',
      }),
    );

    expect(challenge).toEqual({ challengeId: 'c1', userToken: 'u1', encryptionKey: 'k1' });
  });

  it('maps an absent challenge to empty strings rather than undefined', () => {
    expect(toWalletChallenge(walletChallengeSchema.parse({}))).toEqual({
      challengeId: '',
      userToken: '',
      encryptionKey: '',
    });
  });
});
