import { http, HttpResponse } from 'msw';
import { createHttpClient } from '@/core/network/http-client';
import { withMockServer } from './server';

withMockServer(
  http.get('https://api.test/thing', () => HttpResponse.json({ id: 'ok' })),
  http.get('https://api.test/missing', () => new HttpResponse(null, { status: 404 })),
);

describe('the msw harness', () => {
  it('intercepts a request made through the real client', async () => {
    const client = createHttpClient({ baseUrl: 'https://api.test' });

    await expect(client.get<{ id: string }>('/thing')).resolves.toEqual({
      ok: true,
      value: { id: 'ok' },
    });
  });

  it('lets a faked failure arrive as a Result rather than a throw', async () => {
    const client = createHttpClient({ baseUrl: 'https://api.test' });

    const result = await client.get('/missing');

    expect(result.ok).toBe(false);
  });
});
