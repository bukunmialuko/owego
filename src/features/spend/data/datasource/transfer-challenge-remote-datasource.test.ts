import { delay, http, HttpResponse } from 'msw';
import { ErrorCode } from '@/core/errors/app-error';
import { createHttpClient } from '@/core/network/http-client';
import { server, withMockServer } from '@/test/msw/server';
import { createTransferChallengeRemoteDataSource } from './transfer-challenge-remote-datasource';

const BASE_URL = 'https://api.test';
const ENDPOINT = `${BASE_URL}/transaction/challenge-id`;

const BODY = {
  wallet_id: '00000000-0000-4000-8000-000000000002',
  amount: '0.1',
  destination_address: 'Gxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx8',
  token_id: '00000000-0000-4000-8000-000000000001',
};

const CHALLENGE = { challenge_id: 'chal_1', user_token: 'utok_1', encryption_key: 'key_1' };

withMockServer();

function dataSource(timeoutMs?: number) {
  return createTransferChallengeRemoteDataSource(
    createHttpClient({ baseUrl: BASE_URL }),
    timeoutMs === undefined ? {} : { timeoutMs },
  );
}

describe('transfer challenge remote datasource', () => {
  it('posts exactly wallet_id, amount, destination_address and token_id', async () => {
    let sent: unknown;
    server.use(
      http.post(ENDPOINT, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ data: CHALLENGE, error: false });
      }),
    );

    await dataSource().create(BODY);

    expect(sent).toEqual(BODY);
  });

  it('reads the challenge from data', async () => {
    server.use(http.post(ENDPOINT, () => HttpResponse.json({ data: CHALLENGE, error: false })));

    await expect(dataSource().create(BODY)).resolves.toEqual({ ok: true, value: CHALLENGE });
  });

  it('carries the status of a refused challenge', async () => {
    server.use(
      http.post(ENDPOINT, () =>
        HttpResponse.json(
          { dev_msg: 'walletId not found', error: true, msg: 'failed to get challenge id' },
          { status: 400 },
        ),
      ),
    );

    const result = await dataSource().create(BODY);

    expect(result.ok ? undefined : result.error.httpStatus).toBe(400);
  });

  it('refuses a body it cannot read', async () => {
    server.use(http.post(ENDPOINT, () => HttpResponse.json({ data: 'challenge' })));

    const result = await dataSource().create(BODY);

    expect(result.ok ? undefined : result.error.code).toBe(ErrorCode.InvalidInput);
  });

  it('gives up on a challenge that takes too long', async () => {
    server.use(
      http.post(ENDPOINT, async () => {
        await delay(1_000);
        return HttpResponse.json({ data: CHALLENGE, error: false });
      }),
    );

    const result = await dataSource(20).create(BODY);

    expect(result.ok).toBe(false);
  });
});
