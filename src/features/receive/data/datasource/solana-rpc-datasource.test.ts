import { http, HttpResponse } from 'msw';
import { ErrorCode } from '@/core/errors/app-error';
import { createHttpClient } from '@/core/network/http-client';
import { server, withMockServer } from '@/test/msw/server';
import { createSolanaRpcDataSource } from './solana-rpc-datasource';

const RPC_URL = 'https://rpc.solana.test';

type RpcRequest = { jsonrpc: string; id: number; method: string; params: unknown[] };

function answer(results: Record<string, unknown>) {
  const requests: RpcRequest[] = [];
  server.use(
    http.post(RPC_URL, async ({ request }) => {
      const body = (await request.json()) as RpcRequest;
      requests.push(body);
      return HttpResponse.json({ jsonrpc: '2.0', id: body.id, result: results[body.method] });
    }),
  );
  return requests;
}

function dataSource() {
  return createSolanaRpcDataSource(createHttpClient({ baseUrl: RPC_URL }));
}

withMockServer();

describe('SolanaRpcDataSource', () => {
  it('asks for a blockhash the cluster has confirmed', async () => {
    const requests = answer({
      getLatestBlockhash: {
        context: { slot: 250 },
        value: {
          blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
          lastValidBlockHeight: 300,
        },
      },
    });

    const result = await dataSource().getLatestBlockhash();

    expect(requests).toEqual([
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'getLatestBlockhash',
        params: [{ commitment: 'confirmed' }],
      },
    ]);
    expect(result).toEqual({
      ok: true,
      value: {
        context: { slot: 250 },
        value: {
          blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
          lastValidBlockHeight: 300,
        },
      },
    });
  });

  it('reads a token account parsed, at confirmed commitment', async () => {
    const info = {
      mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      owner: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
      tokenAmount: { amount: '5000000', decimals: 6 },
    };
    const requests = answer({
      getAccountInfo: { context: { slot: 1 }, value: { data: { parsed: { info } } } },
    });

    const result = await dataSource().getTokenAccount(
      'AtaAddress1111111111111111111111111111111111',
    );

    expect(requests[0]).toEqual({
      jsonrpc: '2.0',
      id: 1,
      method: 'getAccountInfo',
      params: [
        'AtaAddress1111111111111111111111111111111111',
        { encoding: 'jsonParsed', commitment: 'confirmed' },
      ],
    });
    expect(result).toEqual({ ok: true, value: { data: { parsed: { info } } } });
  });

  it('reads an account that does not exist as null', async () => {
    answer({ getAccountInfo: { context: { slot: 1 }, value: null } });

    expect(await dataSource().getTokenAccount('Missing')).toEqual({ ok: true, value: null });
  });

  it('asks for one signature status without searching history', async () => {
    const requests = answer({
      getSignatureStatuses: { value: [{ err: null, confirmationStatus: 'confirmed' }] },
    });

    const result = await dataSource().getSignatureStatus('sig');

    expect(requests[0]?.params).toEqual([['sig'], { searchTransactionHistory: false }]);
    expect(result).toEqual({ ok: true, value: { err: null, confirmationStatus: 'confirmed' } });
  });

  it('reads a signature the cluster has not seen as null', async () => {
    answer({ getSignatureStatuses: { value: [null] } });

    expect(await dataSource().getSignatureStatus('sig')).toEqual({ ok: true, value: null });
  });

  it('turns a JSON-RPC error into a failed result, naming its code for diagnostics', async () => {
    server.use(
      http.post(RPC_URL, () =>
        HttpResponse.json({ jsonrpc: '2.0', id: 1, error: { code: -32005, message: 'busy' } }),
      ),
    );

    const result = await dataSource().getLatestBlockhash();

    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({ code: ErrorCode.Unknown, detail: 'json-rpc -32005' }),
    });
  });

  it('reports the public endpoint turning the app away as rate limiting', async () => {
    server.use(http.post(RPC_URL, () => new HttpResponse(null, { status: 429 })));

    const result = await dataSource().getLatestBlockhash();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error.code).toBe(ErrorCode.RateLimited);
  });

  it('refuses a result that is not what was asked for', async () => {
    answer({ getLatestBlockhash: { context: { slot: 1 }, value: {} } });

    const result = await dataSource().getLatestBlockhash();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error.code).toBe(ErrorCode.InvalidInput);
  });

  it('refuses a status list that does not answer the one signature asked about', async () => {
    answer({ getSignatureStatuses: { value: [] } });

    const result = await dataSource().getSignatureStatus('sig');

    expect(result.ok).toBe(false);
  });
});
