import { ErrorCode, offline } from '@/core/errors/app-error';
import type { HttpClient } from '@/core/network/http-client';
import { err, ok } from '@/core/result/result';
import { createAuthRemoteDataSource } from './auth-remote-datasource';

function build(response: unknown = { data: { token: 'a', refresh_token: 'r' } }) {
  const post = jest.fn().mockResolvedValue(ok(response));
  const client = { post } as unknown as HttpClient;

  return { dataSource: createAuthRemoteDataSource(client), post };
}

describe('AuthRemoteDataSource', () => {
  describe('country casing', () => {
    it('uppercases the country for google', async () => {
      const { dataSource, post } = build();

      await dataSource.exchangeGoogleToken({ idToken: 'id' }, 'ng');

      expect(post).toHaveBeenCalledWith('/auth/google', { token: 'id', country: 'NG' });
    });

    it('uppercases the country for apple', async () => {
      const { dataSource, post } = build();

      await dataSource.exchangeAppleToken({ idToken: 'id' }, 'ng');

      expect(post).toHaveBeenCalledWith('/auth/apple', expect.objectContaining({ country: 'NG' }));
    });

    it('leaves an already uppercase code alone', async () => {
      const { dataSource, post } = build();

      await dataSource.exchangeGoogleToken({ idToken: 'id' }, 'NG');

      expect(post).toHaveBeenCalledWith('/auth/google', { token: 'id', country: 'NG' });
    });
  });

  describe('apple name fields', () => {
    it('forwards the names when the sdk supplied them', async () => {
      const { dataSource, post } = build();

      await dataSource.exchangeAppleToken(
        { idToken: 'id', givenName: 'Ada', familyName: 'Lovelace' },
        'ng',
      );

      expect(post).toHaveBeenCalledWith('/auth/apple', {
        token: 'id',
        country: 'NG',
        given_name: 'Ada',
        family_name: 'Lovelace',
      });
    });

    it('sends empty names on every later authorization', async () => {
      const { dataSource, post } = build();

      await dataSource.exchangeAppleToken({ idToken: 'id' }, 'ng');

      expect(post).toHaveBeenCalledWith('/auth/apple', {
        token: 'id',
        country: 'NG',
        given_name: '',
        family_name: '',
      });
    });
  });

  describe('response handling', () => {
    it('unwraps the data envelope', async () => {
      const { dataSource } = build({
        data: { token: 'access-1', refresh_token: 'refresh-1', user: { id: 'u1' } },
      });

      const result = await dataSource.exchangeGoogleToken({ idToken: 'id' }, 'ng');

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('expected success');
      expect(result.value.token).toBe('access-1');
      expect(result.value.user.id).toBe('u1');
    });

    it('reports an unparseable body as invalid input', async () => {
      const { dataSource } = build('not an envelope');

      const result = await dataSource.exchangeGoogleToken({ idToken: 'id' }, 'ng');

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected failure');
      expect(result.error.code).toBe(ErrorCode.InvalidInput);
    });

    it('passes a transport failure straight through', async () => {
      const post = jest.fn().mockResolvedValue(err(offline()));
      const dataSource = createAuthRemoteDataSource({ post } as unknown as HttpClient);

      await expect(dataSource.exchangeGoogleToken({ idToken: 'id' }, 'ng')).resolves.toEqual(
        err(offline()),
      );
    });
  });
});
