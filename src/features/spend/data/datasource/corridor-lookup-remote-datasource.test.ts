import { http, HttpResponse } from 'msw';
import { ErrorCode } from '@/core/errors/app-error';
import { createHttpClient } from '@/core/network/http-client';
import { withMockServer } from '@/test/msw/server';
import { server } from '@/test/msw/server';
import { createCorridorLookupRemoteDataSource } from './corridor-lookup-remote-datasource';

const BASE_URL = 'https://api.test';

withMockServer();

function dataSource() {
  return createCorridorLookupRemoteDataSource(createHttpClient({ baseUrl: BASE_URL }));
}

describe('getBanks', () => {
  it("asks for the banks of the corridor's country", async () => {
    let asked: URL | undefined;
    server.use(
      http.get(`${BASE_URL}/transaction/list/banks`, ({ request }) => {
        asked = new URL(request.url);

        return HttpResponse.json({ data: [{ bank_code: '058', bank_name: 'GTBank' }] });
      }),
    );

    const result = await dataSource().getBanks('NG');

    expect(asked?.searchParams.get('country')).toBe('NG');
    expect(result).toEqual({ ok: true, value: [{ bank_code: '058', bank_name: 'GTBank' }] });
  });

  it('refuses a list it cannot read rather than offering nothing as if it were an answer', async () => {
    server.use(
      http.get(`${BASE_URL}/transaction/list/banks`, () => HttpResponse.json({ data: 'banks' })),
    );

    const result = await dataSource().getBanks('NG');

    expect(result.ok ? undefined : result.error.code).toBe(ErrorCode.InvalidInput);
  });
});

describe('resolveAccount', () => {
  it('posts the account number and the bank code, as v1 does', async () => {
    let sent: unknown;
    server.use(
      http.post(`${BASE_URL}/transaction/resolve-account`, async ({ request }) => {
        sent = await request.json();

        return HttpResponse.json({
          data: { account_number: '0000000001', account_name: 'JOHN DOE' },
          error: false,
        });
      }),
    );

    const result = await dataSource().resolveAccount('100004', '0000000001');

    expect(sent).toEqual({ account_number: '0000000001', bank_code: '100004' });
    expect(result).toEqual({
      ok: true,
      value: { account_number: '0000000001', account_name: 'JOHN DOE' },
    });
  });

  it('carries the status of a refused lookup, so the repository can tell unknown from down', async () => {
    server.use(
      http.post(
        `${BASE_URL}/transaction/resolve-account`,
        () => new HttpResponse(null, { status: 404 }),
      ),
    );

    const result = await dataSource().resolveAccount('100004', '0000000000');

    expect(result.ok ? undefined : result.error.httpStatus).toBe(404);
  });
});
