import { ErrorCode, offline } from '@/core/errors/app-error';
import type { HttpClient } from '@/core/network/http-client';
import { err, ok } from '@/core/result/result';
import { createHomeRemoteDataSource } from './home-remote-datasource';

function build(response: unknown) {
  const get = jest.fn().mockResolvedValue(ok(response));

  return { dataSource: createHomeRemoteDataSource({ get } as unknown as HttpClient), get };
}

describe('HomeRemoteDataSource', () => {
  describe('getTransactionPage', () => {
    it('asks for the requested page at the requested size', async () => {
      const { dataSource, get } = build({ data: { data: [], total: 0, page: 3, limit: 20 } });

      await dataSource.getTransactionPage(3, 20);

      expect(get).toHaveBeenCalledWith('/transaction?page=3&limit=20');
    });

    it('unwraps the double-nested envelope the real backend sends', async () => {
      const { dataSource } = build({
        data: {
          data: [{ id: 't1', amount: 15, currency: 'USDC', status: 'SUCCESSFUL', type: 'CREDIT' }],
          total: 127,
          page: 1,
          limit: 5,
        },
        error: false,
      });

      const result = await dataSource.getTransactionPage(1, 5);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('expected success');
      expect(result.value.data).toHaveLength(1);
      expect(result.value.data[0]?.id).toBe('t1');
    });

    it('keeps the totals the server reported beside the rows', async () => {
      const { dataSource } = build({ data: { data: [], total: 127, page: 2, limit: 20 } });

      const result = await dataSource.getTransactionPage(2, 20);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('expected success');
      expect(result.value).toMatchObject({ total: 127, page: 2, limit: 20 });
    });

    it('reports a transaction list of the wrong shape as invalid input', async () => {
      const { dataSource } = build({ data: { data: 'not a list' } });

      const result = await dataSource.getTransactionPage(1, 5);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected failure');
      expect(result.error.code).toBe(ErrorCode.InvalidInput);
    });

    it('passes a transport failure straight through', async () => {
      const get = jest.fn().mockResolvedValue(err(offline()));
      const dataSource = createHomeRemoteDataSource({ get } as unknown as HttpClient);

      await expect(dataSource.getTransactionPage(1, 5)).resolves.toEqual(err(offline()));
    });
  });

  describe('getTransaction', () => {
    it('reads one transaction by id', async () => {
      const { dataSource, get } = build({ data: { id: 't1' } });

      await dataSource.getTransaction('00000000-0000-4000-8000-000000000007');

      expect(get).toHaveBeenCalledWith('/transaction/00000000-0000-4000-8000-000000000007');
    });

    it('encodes the id so it cannot leave its path segment', async () => {
      const { dataSource, get } = build({ data: { id: 't1' } });

      await dataSource.getTransaction('a/../b?c');

      expect(get).toHaveBeenCalledWith('/transaction/a%2F..%2Fb%3Fc');
    });

    it('unwraps the recorded envelope', async () => {
      const { dataSource } = build({
        data: { id: '00000000-0000-4000-8000-000000000004', type: 'INVOICE', meta_data: null },
        error: false,
      });

      const result = await dataSource.getTransaction('00000000-0000-4000-8000-000000000004');

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('expected success');
      expect(result.value.id).toBe('00000000-0000-4000-8000-000000000004');
      expect(result.value.type).toBe('INVOICE');
    });

    it('reports a transaction of the wrong shape as invalid input', async () => {
      const { dataSource } = build({ data: { amount: 'fifteen' } });

      const result = await dataSource.getTransaction('t1');

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected failure');
      expect(result.error.code).toBe(ErrorCode.InvalidInput);
    });

    it('passes a transport failure straight through', async () => {
      const get = jest.fn().mockResolvedValue(err(offline()));
      const dataSource = createHomeRemoteDataSource({ get } as unknown as HttpClient);

      await expect(dataSource.getTransaction('t1')).resolves.toEqual(err(offline()));
    });
  });
});
