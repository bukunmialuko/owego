import { ErrorCode, offline } from '@/core/errors/app-error';
import type { HttpClient } from '@/core/network/http-client';
import { err, ok } from '@/core/result/result';
import { createReceiveRemoteDataSource } from './receive-remote-datasource';

function build(response: unknown) {
  const get = jest.fn().mockResolvedValue(ok(response));
  const post = jest.fn().mockResolvedValue(ok(response));

  return {
    dataSource: createReceiveRemoteDataSource({ get, post } as unknown as HttpClient),
    get,
    post,
  };
}

describe('ReceiveRemoteDataSource', () => {
  describe('endpoints', () => {
    it('reads the chain list from /deposit-wallet/chains', async () => {
      const { dataSource, get } = build({ data: [] });

      await dataSource.getChains();

      expect(get).toHaveBeenCalledWith('/deposit-wallet/chains');
    });

    it('posts the chain code, and nothing else, to /deposit-wallet', async () => {
      const { dataSource, post } = build({ data: { chain: 'BASE', address: '', status: '' } });

      await dataSource.getAddress('BASE');

      expect(post).toHaveBeenCalledWith('/deposit-wallet', { chain: 'BASE' });
    });
  });

  describe('parsing', () => {
    it('unwraps the chain list envelope', async () => {
      const { dataSource } = build({
        data: [{ key: 'BASE', blockchain: 'BASE-SEPOLIA', enabled: true }],
      });

      const result = await dataSource.getChains();

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('expected success');
      expect(result.value[0]?.key).toBe('BASE');
    });

    it('unwraps the deposit-address envelope', async () => {
      const { dataSource } = build({ data: { chain: 'BASE', address: '0xabc', status: 'ACTIVE' } });

      const result = await dataSource.getAddress('BASE');

      expect(result).toEqual(ok({ chain: 'BASE', address: '0xabc', status: 'ACTIVE' }));
    });

    it('reports a chain list of the wrong shape as invalid input', async () => {
      const { dataSource } = build({ data: 'not a list' });

      const result = await dataSource.getChains();

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected failure');
      expect(result.error.code).toBe(ErrorCode.InvalidInput);
    });
  });

  it('passes a transport failure straight through', async () => {
    const get = jest.fn().mockResolvedValue(err(offline()));
    const dataSource = createReceiveRemoteDataSource({ get } as unknown as HttpClient);

    await expect(dataSource.getChains()).resolves.toEqual(err(offline()));
  });
});
