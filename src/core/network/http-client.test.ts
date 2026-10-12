import { AxiosError, type AxiosAdapter, type AxiosRequestConfig } from 'axios';
import type { AppError } from '@/core/errors/app-error';
import { setLogSink } from '@/core/log/dev-log';
import { ok, type Result } from '@/core/result/result';
import { createFakeTokenStore } from '@/test/fake-token-store';
import { createHttpClient } from './http-client';
import type { RefreshOutcome, RefreshTokenService } from './refresh-token-service';
import type { AuthTokens, TokenStore } from './auth-tokens';

const tokens: AuthTokens = { access: 'access-1', refresh: 'refresh-1' };

function stubTokenStore(initial: AuthTokens | undefined = tokens): TokenStore {
  let current: AuthTokens | undefined = initial;
  return {
    read: () => Promise.resolve(current),
    write: (next) => {
      current = next;
      return Promise.resolve(ok(undefined));
    },
    restore: (refresh) => {
      current = { access: '', refresh };
    },
    clear: () => {
      current = undefined;
      return Promise.resolve();
    },
    lock: () => {
      current = undefined;
    },
    onTokensPersisted: () => () => true,
  };
}

function stubRefreshService(outcome: RefreshOutcome): RefreshTokenService & { calls: number } {
  return {
    calls: 0,
    refresh() {
      this.calls += 1;
      return Promise.resolve(outcome);
    },
  };
}

type ScriptStep = { status: number; data?: unknown; headers?: unknown };

function scriptedAdapter(script: ScriptStep[]) {
  const seen: AxiosRequestConfig[] = [];
  let index = 0;

  const adapter: AxiosAdapter = (config) => {
    seen.push(config);
    const step = script[Math.min(index, script.length - 1)];
    index += 1;

    return Promise.resolve({
      data: step?.data ?? {},
      status: step?.status ?? 200,
      statusText: '',
      headers: step !== undefined && 'headers' in step ? step.headers : {},
      config,
    } as never);
  };

  return { adapter, seen };
}

function settlingAdapter(status: number, data: unknown = {}): AxiosAdapter {
  return (config) => {
    const response = { data, status, statusText: '', headers: {}, config };

    if (config.validateStatus?.(status) === false) {
      return Promise.reject(
        new AxiosError(
          'Request failed',
          'ERR_BAD_RESPONSE',
          undefined,
          undefined,
          response as never,
        ),
      );
    }

    return Promise.resolve(response as never);
  };
}

function failingAdapter(cause: unknown): AxiosAdapter {
  // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
  return () => Promise.reject(cause);
}

function summarise(request: AxiosRequestConfig): [string | undefined, string | undefined, unknown] {
  return [request.method, request.url, request.data];
}

function expectFailure<T>(result: Result<T, AppError>): AppError {
  if (result.ok) throw new Error('expected a failure');
  return result.error;
}

describe('HttpClient', () => {
  afterEach(() => {
    setLogSink(() => undefined);
  });

  describe('unauthenticated client', () => {
    it('never writes a query string to the log line', async () => {
      const lines: string[] = [];
      setLogSink((line) => lines.push(line));
      const path = '/yield/deposit/quote?amount=98765';

      await createHttpClient({
        baseUrl: 'https://api.test',
        adapter: scriptedAdapter([{ status: 200 }]).adapter,
      }).get(path);
      await createHttpClient({
        baseUrl: 'https://api.test',
        adapter: scriptedAdapter([{ status: 422 }]).adapter,
      }).get(path);
      await createHttpClient({
        baseUrl: 'https://api.test',
        adapter: failingAdapter(new AxiosError('timeout', 'ECONNABORTED')),
      }).get(path);

      expect(lines).toHaveLength(3);
      for (const line of lines) {
        expect(line).toContain('GET /yield/deposit/quote');
        expect(line).not.toContain('98765');
        expect(line).not.toContain('amount=');
      }
    });

    it('sends no authorization header', async () => {
      const { adapter, seen } = scriptedAdapter([{ status: 200, data: { ok: true } }]);
      const client = createHttpClient({ baseUrl: 'https://api.test', adapter });

      await client.post('/auth/google', { token: 'id-token' });

      expect(seen[0]?.headers?.['Authorization']).toBeUndefined();
    });

    it('returns the parsed body on success', async () => {
      const { adapter } = scriptedAdapter([{ status: 200, data: { id: 'w1' } }]);
      const client = createHttpClient({ baseUrl: 'https://api.test', adapter });

      await expect(client.get('/wallets')).resolves.toEqual({ ok: true, value: { id: 'w1' } });
    });

    it('normalizes a failure into an AppError instead of throwing', async () => {
      const { adapter } = scriptedAdapter([{ status: 503 }]);
      const client = createHttpClient({ baseUrl: 'https://api.test', adapter });

      const result = await client.get('/wallets');

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected failure');
      expect(result.error).toMatchObject({ code: 'server/internal', retryable: true });
    });

    it('sends each verb with its own method, path and body', async () => {
      const { adapter, seen } = scriptedAdapter([{ status: 200, data: { done: true } }]);
      const client = createHttpClient({ baseUrl: 'https://api.test', adapter });

      const results = [
        await client.get('/a'),
        await client.post('/b', { n: 1 }),
        await client.put('/c', { n: 2 }),
        await client.patch('/d', { n: 3 }),
        await client.delete('/e'),
      ];

      expect(seen.map(summarise)).toEqual([
        ['get', '/a', undefined],
        ['post', '/b', '{"n":1}'],
        ['put', '/c', '{"n":2}'],
        ['patch', '/d', '{"n":3}'],
        ['delete', '/e', undefined],
      ]);
      expect(results.map((result) => result.ok)).toEqual([true, true, true, true, true]);
    });

    it('keeps a rejected status a value when the transport would have thrown', async () => {
      const client = createHttpClient({
        baseUrl: 'https://api.test',
        adapter: settlingAdapter(500, { message: 'boom' }),
      });

      expect(expectFailure(await client.get('/wallets'))).toMatchObject({
        code: 'server/internal',
        httpStatus: 500,
        detail: 'boom',
      });
    });

    it('treats an informational status as a failure rather than a body', async () => {
      const { adapter } = scriptedAdapter([{ status: 199, data: { id: 'w1' } }]);
      const client = createHttpClient({ baseUrl: 'https://api.test', adapter });

      expect(expectFailure(await client.get('/wallets'))).toMatchObject({
        code: 'common/unknown',
        httpStatus: 199,
      });
    });

    it('reports a request the transport timed out as a timeout', async () => {
      const client = createHttpClient({
        baseUrl: 'https://api.test',
        timeoutMs: 10,
        adapter: failingAdapter(new AxiosError('timeout of 10ms exceeded', 'ECONNABORTED')),
      });

      expect(expectFailure(await client.get('/wallets'))).toMatchObject({
        code: 'network/timeout',
        retryable: true,
      });
    });

    it('reports a transport failure that is not a timeout as being offline', async () => {
      const client = createHttpClient({
        baseUrl: 'https://api.test',
        adapter: failingAdapter(new AxiosError('Network Error', 'ERR_NETWORK')),
      });

      expect(expectFailure(await client.get('/wallets'))).toMatchObject({
        code: 'network/offline',
        retryable: true,
      });
    });

    it('reports a non-axios throw as an unknown error rather than a network one', async () => {
      const client = createHttpClient({
        baseUrl: 'https://api.test',
        adapter: failingAdapter(new TypeError('adapter is not a function')),
      });

      expect(expectFailure(await client.get('/wallets'))).toMatchObject({
        code: 'common/unknown',
        detail: 'adapter is not a function',
        retryable: false,
      });
    });

    it('fails a request whose signal was aborted before it left', async () => {
      const client = createHttpClient({ baseUrl: 'https://api.test' });
      const controller = new AbortController();
      controller.abort();

      const error = expectFailure(await client.get('/wallets', { signal: controller.signal }));

      expect(error.code).toBe('network/cancelled');
      expect(error.retryable).toBe(false);
    });

    it('hands the transport the configured timeout, or five minutes by default', async () => {
      const configured = scriptedAdapter([{ status: 200 }]);
      const fallback = scriptedAdapter([{ status: 200 }]);

      await createHttpClient({
        baseUrl: 'https://api.test',
        adapter: configured.adapter,
        timeoutMs: 1_000,
      }).get('/wallets');
      await createHttpClient({
        baseUrl: 'https://api.test',
        adapter: fallback.adapter,
      }).get('/wallets');

      expect(configured.seen[0]?.timeout).toBe(1_000);
      expect(fallback.seen[0]?.timeout).toBe(300_000);
    });

    it('lets one request carry a shorter timeout than the client default', async () => {
      const { adapter, seen } = scriptedAdapter([{ status: 200 }, { status: 200 }]);
      const client = createHttpClient({ baseUrl: 'https://api.test', adapter });

      await client.get('/user/wallets', { timeoutMs: 15_000 });
      await client.get('/user/wallets');

      expect(seen[0]?.timeout).toBe(15_000);
      expect(seen[1]?.timeout).toBe(300_000);
    });
  });

  describe('response headers', () => {
    it('carries the correlation id from the response onto the error', async () => {
      const { adapter } = scriptedAdapter([
        { status: 500, headers: { 'X-Request-Id': 'trace-9' } },
      ]);
      const client = createHttpClient({ baseUrl: 'https://api.test', adapter });

      expect(expectFailure(await client.get('/wallets')).traceId).toBe('trace-9');
    });

    it('reads retry-after whatever case the server sent the header in', async () => {
      const { adapter } = scriptedAdapter([{ status: 429, headers: { 'Retry-After': '30' } }]);
      const client = createHttpClient({ baseUrl: 'https://api.test', adapter });

      expect(expectFailure(await client.get('/wallets'))).toMatchObject({
        code: 'common/rate-limited',
        retryAfterSeconds: 30,
      });
    });

    it('invents no retry delay from a retry-after it cannot read', async () => {
      const { adapter } = scriptedAdapter([
        { status: 429, headers: { 'Retry-After': 'Wed, 21 Oct 2015 07:28:00 GMT' } },
      ]);
      const client = createHttpClient({ baseUrl: 'https://api.test', adapter });

      const error = expectFailure(await client.get('/wallets'));

      expect(error.code).toBe('common/rate-limited');
      expect(error.retryAfterSeconds).toBeUndefined();
    });

    it('still produces an error when the response carries no headers at all', async () => {
      for (const headers of [undefined, null]) {
        const { adapter } = scriptedAdapter([{ status: 500, headers }]);
        const client = createHttpClient({ baseUrl: 'https://api.test', adapter });

        const error = expectFailure(await client.get('/wallets'));

        expect(error.code).toBe('server/internal');
        expect(error.traceId).toBeUndefined();
      }
    });
  });

  describe('authenticated client', () => {
    it('lets a caller-supplied bearer beat the stored one', async () => {
      const { adapter, seen } = scriptedAdapter([{ status: 200 }]);
      const client = createHttpClient({
        baseUrl: 'https://api.test',
        adapter,
        auth: {
          tokenStore: stubTokenStore(),
          refreshService: stubRefreshService({ type: 'invalid-session' }),
          onSessionExpired: () => undefined,
        },
      });

      await client.delete('/user/push/token', { headers: { Authorization: 'Bearer snapshot' } });

      expect(seen[0]?.headers?.['Authorization']).toBe('Bearer snapshot');
    });

    it('attaches the stored access token', async () => {
      const { adapter, seen } = scriptedAdapter([{ status: 200 }]);
      const client = createHttpClient({
        baseUrl: 'https://api.test',
        adapter,
        auth: {
          tokenStore: stubTokenStore(),
          refreshService: stubRefreshService({ type: 'transient' }),
          onSessionExpired: jest.fn(),
        },
      });

      await client.get('/wallets');

      expect(seen[0]?.headers?.['Authorization']).toBe('Bearer access-1');
    });

    it('refreshes once on 401 and replays with the new token', async () => {
      const { adapter, seen } = scriptedAdapter([
        { status: 401 },
        { status: 200, data: { ok: 1 } },
      ]);
      const refreshService = stubRefreshService({
        type: 'refreshed',
        tokens: { access: 'access-2', refresh: 'refresh-2' },
      });
      const client = createHttpClient({
        baseUrl: 'https://api.test',
        adapter,
        auth: { tokenStore: stubTokenStore(), refreshService, onSessionExpired: jest.fn() },
      });

      const result = await client.get('/wallets');

      expect(refreshService.calls).toBe(1);
      expect(seen).toHaveLength(2);
      expect(seen[1]?.headers?.['Authorization']).toBe('Bearer access-2');
      expect(result).toEqual({ ok: true, value: { ok: 1 } });
    });

    it('gives up after one refresh rather than looping', async () => {
      const { adapter, seen } = scriptedAdapter([{ status: 401 }]);
      const refreshService = stubRefreshService({
        type: 'refreshed',
        tokens: { access: 'access-2', refresh: 'refresh-2' },
      });
      const client = createHttpClient({
        baseUrl: 'https://api.test',
        adapter,
        auth: { tokenStore: stubTokenStore(), refreshService, onSessionExpired: jest.fn() },
      });

      const result = await client.get('/wallets');

      expect(refreshService.calls).toBe(1);
      expect(seen).toHaveLength(2);
      expect(result.ok).toBe(false);
    });

    it('refreshes once on 403 and replays with the new token', async () => {
      const { adapter, seen } = scriptedAdapter([
        { status: 403 },
        { status: 200, data: { ok: 1 } },
      ]);
      const refreshService = stubRefreshService({
        type: 'refreshed',
        tokens: { access: 'access-2', refresh: 'refresh-2' },
      });
      const client = createHttpClient({
        baseUrl: 'https://api.test',
        adapter,
        auth: { tokenStore: stubTokenStore(), refreshService, onSessionExpired: jest.fn() },
      });

      const result = await client.get('/wallets');

      expect(refreshService.calls).toBe(1);
      expect(seen).toHaveLength(2);
      expect(seen[1]?.headers?.['Authorization']).toBe('Bearer access-2');
      expect(result).toEqual({ ok: true, value: { ok: 1 } });
    });

    it('never refreshes for a 403 on an auth endpoint', async () => {
      const { adapter, seen } = scriptedAdapter([{ status: 403 }]);
      const refreshService = stubRefreshService({ type: 'refreshed', tokens });
      const client = createHttpClient({
        baseUrl: 'https://api.test',
        adapter,
        auth: { tokenStore: stubTokenStore(), refreshService, onSessionExpired: jest.fn() },
      });

      await client.post('/auth/google', {});

      expect(refreshService.calls).toBe(0);
      expect(seen).toHaveLength(1);
    });

    it('signs out only once for concurrent 403s', async () => {
      const { adapter } = scriptedAdapter([{ status: 403 }]);
      const onSessionExpired = jest.fn();
      const client = createHttpClient({
        baseUrl: 'https://api.test',
        adapter,
        auth: {
          tokenStore: stubTokenStore(),
          refreshService: stubRefreshService({ type: 'invalid-session' }),
          onSessionExpired,
        },
      });

      await Promise.all([client.get('/a'), client.get('/b'), client.get('/c')]);

      expect(onSessionExpired).toHaveBeenCalledTimes(1);
    });

    it('leaves statuses that are not 401 or 403 alone', async () => {
      const refreshService = stubRefreshService({ type: 'refreshed', tokens });

      for (const status of [404, 422, 429, 500]) {
        const { adapter, seen } = scriptedAdapter([{ status }]);
        const client = createHttpClient({
          baseUrl: 'https://api.test',
          adapter,
          auth: { tokenStore: stubTokenStore(), refreshService, onSessionExpired: jest.fn() },
        });

        await client.get('/wallets');

        expect(seen).toHaveLength(1);
      }

      expect(refreshService.calls).toBe(0);
    });

    it('signs out when the session is invalid', async () => {
      const { adapter } = scriptedAdapter([{ status: 401 }]);
      const onSessionExpired = jest.fn();
      const client = createHttpClient({
        baseUrl: 'https://api.test',
        adapter,
        auth: {
          tokenStore: stubTokenStore(),
          refreshService: stubRefreshService({ type: 'invalid-session' }),
          onSessionExpired,
        },
      });

      await client.get('/wallets');

      expect(onSessionExpired).toHaveBeenCalledTimes(1);
    });

    it('does not sign out when the refresh merely failed to reach the server', async () => {
      const { adapter } = scriptedAdapter([{ status: 401 }]);
      const onSessionExpired = jest.fn();
      const client = createHttpClient({
        baseUrl: 'https://api.test',
        adapter,
        auth: {
          tokenStore: stubTokenStore(),
          refreshService: stubRefreshService({ type: 'transient' }),
          onSessionExpired,
        },
      });

      await client.get('/wallets');

      expect(onSessionExpired).not.toHaveBeenCalled();
    });

    it('never refreshes for an auth endpoint', async () => {
      const { adapter, seen } = scriptedAdapter([{ status: 401 }]);
      const refreshService = stubRefreshService({ type: 'refreshed', tokens });
      const client = createHttpClient({
        baseUrl: 'https://api.test',
        adapter,
        auth: { tokenStore: stubTokenStore(), refreshService, onSessionExpired: jest.fn() },
      });

      await client.post('/auth/google', {});

      expect(refreshService.calls).toBe(0);
      expect(seen).toHaveLength(1);
    });

    it('signs out only once for concurrent failures', async () => {
      const { adapter } = scriptedAdapter([{ status: 401 }]);
      const onSessionExpired = jest.fn();
      const client = createHttpClient({
        baseUrl: 'https://api.test',
        adapter,
        auth: {
          tokenStore: stubTokenStore(),
          refreshService: stubRefreshService({ type: 'invalid-session' }),
          onSessionExpired,
        },
      });

      await Promise.all([client.get('/a'), client.get('/b'), client.get('/c')]);

      expect(onSessionExpired).toHaveBeenCalledTimes(1);
    });

    it('sends no authorization header when the store holds nothing', async () => {
      const { adapter, seen } = scriptedAdapter([{ status: 200 }]);
      const client = createHttpClient({
        baseUrl: 'https://api.test',
        adapter,
        auth: {
          tokenStore: createFakeTokenStore(),
          refreshService: stubRefreshService({ type: 'transient' }),
          onSessionExpired: jest.fn(),
        },
      });

      await client.get('/wallets');

      expect(seen[0]?.headers?.['Authorization']).toBeUndefined();
    });

    it('sends a caller-supplied bearer when the client has no token of its own', async () => {
      const { adapter, seen } = scriptedAdapter([{ status: 200 }]);
      const client = createHttpClient({
        baseUrl: 'https://api.test',
        adapter,
        auth: {
          tokenStore: createFakeTokenStore(),
          refreshService: stubRefreshService({ type: 'transient' }),
          onSessionExpired: jest.fn(),
        },
      });

      await client.delete('/devices/push', { headers: { Authorization: 'Bearer snapshot' } });

      expect(seen[0]?.headers?.['Authorization']).toBe('Bearer snapshot');
    });

    it('keeps a per-request header alongside the stored bearer', async () => {
      const { adapter, seen } = scriptedAdapter([{ status: 200 }]);
      const client = createHttpClient({
        baseUrl: 'https://api.test',
        adapter,
        auth: {
          tokenStore: stubTokenStore(),
          refreshService: stubRefreshService({ type: 'transient' }),
          onSessionExpired: jest.fn(),
        },
      });

      const headers = { 'X-Idempotency-Key': 'k1' };
      await client.post('/payouts', { amount: '10.00' }, { headers });

      expect(seen[0]?.headers?.['X-Idempotency-Key']).toBe('k1');
      expect(seen[0]?.headers?.['Authorization']).toBe('Bearer access-1');
    });

    it('does not refresh a request the caller opted out of', async () => {
      const { adapter, seen } = scriptedAdapter([{ status: 401 }]);
      const refreshService = stubRefreshService({ type: 'refreshed', tokens });
      const client = createHttpClient({
        baseUrl: 'https://api.test',
        adapter,
        auth: { tokenStore: stubTokenStore(), refreshService, onSessionExpired: jest.fn() },
      });

      const result = await client.get('/wallets', { skipAuthRefresh: true });

      expect(refreshService.calls).toBe(0);
      expect(seen).toHaveLength(1);
      expect(expectFailure(result).code).toBe('auth/unauthenticated');
    });

    it('returns the replayed failure when the retry fails for another reason', async () => {
      const { adapter } = scriptedAdapter([{ status: 401 }, { status: 500 }]);
      const refreshService = stubRefreshService({
        type: 'refreshed',
        tokens: { access: 'access-2', refresh: 'refresh-2' },
      });
      const client = createHttpClient({
        baseUrl: 'https://api.test',
        adapter,
        auth: { tokenStore: stubTokenStore(), refreshService, onSessionExpired: jest.fn() },
      });

      expect(expectFailure(await client.get('/wallets')).code).toBe('server/internal');
    });

    it('surfaces a transport failure during a refreshed replay instead of hanging', async () => {
      const failure = new AxiosError('Network Error', 'ERR_NETWORK');
      let calls = 0;
      const adapter: AxiosAdapter = (config) => {
        calls += 1;
        if (calls === 1) {
          return Promise.resolve({
            data: {},
            status: 401,
            statusText: '',
            headers: {},
            config,
          } as never);
        }
        return Promise.reject(failure);
      };
      const client = createHttpClient({
        baseUrl: 'https://api.test',
        adapter,
        auth: {
          tokenStore: stubTokenStore(),
          refreshService: stubRefreshService({
            type: 'refreshed',
            tokens: { access: 'access-2', refresh: 'refresh-2' },
          }),
          onSessionExpired: jest.fn(),
        },
      });

      expect(expectFailure(await client.get('/wallets')).code).toBe('network/offline');
    });
  });
});
