import { offline } from '@/core/errors/app-error';
import { createKeyValueStorage } from '@/core/storage/mmkv-key-value-storage';
import { CacheKey } from '@/core/storage/storage-keys';
import { err, ok } from '@/core/result/result';
import { walletChallengeSchema, walletSchema } from '../model/wallet-model';
import type { WalletRemoteDataSource } from '../datasource/wallet-remote-datasource';
import { createWalletRepositoryImpl } from './wallet-repository-impl';

const walletDto = walletSchema.parse({
  id: 'w1',
  address: '4k3D',
  blockchain: 'SOL',
  balances: [{ token_id: 'usdc', symbol: 'USDC', amount: '5136.98', decimals: 6 }],
});

function build(remote: Partial<WalletRemoteDataSource> = {}) {
  const cache = createKeyValueStorage('wallet-repo-test');
  cache.clearAll();

  const remoteDataSource = {
    getWallets: jest.fn().mockResolvedValue(ok([walletDto])),
    createChallenge: jest.fn().mockResolvedValue(
      ok(
        walletChallengeSchema.parse({
          challenge_id: 'c1',
          user_token: 'u1',
          encryption_key: 'k1',
        }),
      ),
    ),
    createPinChangeChallenge: jest.fn(() =>
      Promise.resolve(
        ok(
          walletChallengeSchema.parse({
            challenge_id: 'pin-c1',
            user_token: 'u1',
            encryption_key: 'k1',
          }),
        ),
      ),
    ),
    ...remote,
  } satisfies WalletRemoteDataSource;

  return { repository: createWalletRepositoryImpl({ remoteDataSource, cache }), cache };
}

describe('WalletRepository', () => {
  it('maps the wire payload onto the domain wallet', async () => {
    const { repository } = build();

    const result = await repository.getWallets();

    expect(result).toEqual(
      ok([
        expect.objectContaining({
          id: 'w1',
          balances: [{ tokenId: 'usdc', symbol: 'USDC', amount: '5136.98', decimals: 6 }],
        }),
      ]),
    );
  });

  it('caches the list so a cold start can render before the network answers', async () => {
    const { repository, cache } = build();

    await repository.getWallets();

    expect(cache.getString(CacheKey.WalletList)).toContain('w1');
  });

  it('caches nothing when the fetch fails', async () => {
    const { repository, cache } = build({
      getWallets: jest.fn().mockResolvedValue(err(offline())),
    });

    await expect(repository.getWallets()).resolves.toEqual(err(offline()));
    expect(cache.getString(CacheKey.WalletList)).toBeUndefined();
  });

  it('maps the challenge onto its domain shape', async () => {
    const { repository } = build();

    await expect(repository.createChallenge()).resolves.toEqual(
      ok({ challengeId: 'c1', userToken: 'u1', encryptionKey: 'k1' }),
    );
  });

  it('never writes the challenge credentials to storage', async () => {
    const { repository, cache } = build();

    await repository.createChallenge();

    const written = Object.values(CacheKey)
      .map((key) => cache.getString(key))
      .filter((value): value is string => value !== undefined);

    expect(written).toEqual([]);
  });
});

describe('WalletRepository — challenge validity', () => {
  it.each([
    ['challenge_id', { challenge_id: '', user_token: 'u1', encryption_key: 'k1' }],
    ['user_token', { challenge_id: 'c1', user_token: '', encryption_key: 'k1' }],
    ['encryption_key', { challenge_id: 'c1', user_token: 'u1', encryption_key: '' }],
  ])('refuses a challenge with a blank %s', async (_field, payload) => {
    const { repository } = build({
      createChallenge: jest.fn().mockResolvedValue(ok(walletChallengeSchema.parse(payload))),
    });

    const result = await repository.createChallenge();

    expect(result.ok).toBe(false);
  });

  it('refuses the empty payload the total schema happily parses', async () => {
    const { repository } = build({
      createChallenge: jest.fn().mockResolvedValue(ok(walletChallengeSchema.parse({}))),
    });

    expect(walletChallengeSchema.parse({})).toEqual({
      challenge_id: '',
      user_token: '',
      encryption_key: '',
    });
    await expect(repository.createChallenge()).resolves.toMatchObject({ ok: false });
  });

  it('passes a complete challenge through', async () => {
    const { repository } = build();

    await expect(repository.createChallenge()).resolves.toEqual(
      ok({ challengeId: 'c1', userToken: 'u1', encryptionKey: 'k1' }),
    );
  });
});
