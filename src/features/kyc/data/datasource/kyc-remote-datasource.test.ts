import { offline } from '@/core/errors/app-error';
import type { HttpClient } from '@/core/network/http-client';
import { err, ok } from '@/core/result/result';
import { createKycRemoteDataSource } from './kyc-remote-datasource';

function build(response: Awaited<ReturnType<HttpClient['post']>>) {
  const post = jest.fn().mockResolvedValue(response);

  return { dataSource: createKycRemoteDataSource({ post } as unknown as HttpClient), post };
}

describe('KycRemoteDataSource', () => {
  it('opens the session on the authenticated client', async () => {
    const { dataSource, post } = build(ok({}));

    await dataSource.createSession();

    expect(post).toHaveBeenCalledWith('/user/kyc/didit/session');
  });

  it('reads the session flat, with no data envelope', async () => {
    const { dataSource } = build(
      ok({
        error: false,
        session_id: 's1',
        session_token: 'token-1',
        url: 'https://verify.didit.me/s1',
        status: 'Not Started',
      }),
    );

    await expect(dataSource.createSession()).resolves.toEqual({
      ok: true,
      value: {
        session_id: 's1',
        session_token: 'token-1',
        url: 'https://verify.didit.me/s1',
        status: 'Not Started',
      },
    });
  });

  it('degrades a partial payload rather than throwing', async () => {
    const { dataSource } = build(ok({ session_id: 's1' }));

    await expect(dataSource.createSession()).resolves.toEqual({
      ok: true,
      value: { session_id: 's1', session_token: '', url: '', status: '' },
    });
  });

  it('reports a payload that is not an object as a parse failure', async () => {
    const { dataSource } = build(ok('nope'));

    const result = await dataSource.createSession();

    expect(result.ok).toBe(false);
  });

  it('passes a transport failure through untouched', async () => {
    const { dataSource } = build(err(offline()));

    await expect(dataSource.createSession()).resolves.toEqual({ ok: false, error: offline() });
  });
});
