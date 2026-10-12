import { ErrorCode, offline } from '@/core/errors/app-error';
import type { HttpClient } from '@/core/network/http-client';
import { err, ok } from '@/core/result/result';
import { createWalletRemoteDataSource } from './wallet-remote-datasource';

function build(response: unknown) {
  const get = jest.fn().mockResolvedValue(ok(response));
  const post = jest.fn().mockResolvedValue(ok(response));

  return {
    dataSource: createWalletRemoteDataSource({ get, post } as unknown as HttpClient),
    get,
    post,
  };
}

describe('WalletRemoteDataSource', () => {
  describe('endpoints', () => {
    it('reads the wallet list from /user/wallets', async () => {
      const { dataSource, get } = build({ data: [] });

      await dataSource.getWallets();

      expect(get).toHaveBeenCalledWith('/user/wallets', {});
    });

    it('passes a caller’s signal and timeout to the request', async () => {
      const { dataSource, get } = build({ data: [] });
      const { signal } = new AbortController();

      await dataSource.getWallets({ signal, timeoutMs: 15_000 });

      expect(get).toHaveBeenCalledWith('/user/wallets', { signal, timeoutMs: 15_000 });
    });

    it('posts the challenge to /user/wallet/challenge', async () => {
      const { dataSource, post } = build({ data: {} });

      await dataSource.createChallenge();

      expect(post).toHaveBeenCalledWith('/user/wallet/challenge');
    });
  });

  describe('parsing', () => {
    it('unwraps the wallet list envelope', async () => {
      const { dataSource } = build({ data: [{ id: 'w1', balances: [] }] });

      const result = await dataSource.getWallets();

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('expected success');
      expect(result.value[0]?.id).toBe('w1');
    });

    it('parses a freshly provisioned wallet sent with null balances', async () => {
      const { dataSource } = build({
        data: [{ id: 'w1', address: 'So1ana', blockchain: 'SOL', balances: null }],
      });

      const result = await dataSource.getWallets();

      expect(result).toEqual(
        ok([{ id: 'w1', address: 'So1ana', blockchain: 'SOL', balances: [] }]),
      );
    });

    it('unwraps the challenge envelope', async () => {
      const { dataSource } = build({
        data: { challenge_id: 'c1', user_token: 'u1', encryption_key: 'k1' },
      });

      const result = await dataSource.createChallenge();

      expect(result).toEqual(ok({ challenge_id: 'c1', user_token: 'u1', encryption_key: 'k1' }));
    });

    it('reports a wallet list of the wrong shape as invalid input', async () => {
      const { dataSource } = build({ data: 'not a list' });

      const result = await dataSource.getWallets();

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected failure');
      expect(result.error.code).toBe(ErrorCode.InvalidInput);
    });
  });

  it('passes a transport failure straight through', async () => {
    const get = jest.fn().mockResolvedValue(err(offline()));
    const dataSource = createWalletRemoteDataSource({ get } as unknown as HttpClient);

    await expect(dataSource.getWallets()).resolves.toEqual(err(offline()));
  });
});
