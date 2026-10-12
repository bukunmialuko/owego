import { createEphemeralTokenPersistence } from './token-persistence';
import { unknownError } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import type { TokenPersistence } from './token-persistence';
import { createTokenStore, type AuthTokens } from './auth-tokens';

const tokens: AuthTokens = { access: 'access-1', refresh: 'refresh-1' };

function sealed(initial?: string) {
  let stored = initial;
  let saves = 0;
  const persistence: TokenPersistence = {
    persists: () => Promise.resolve(true),
    save: (refresh) => {
      saves += 1;
      stored = refresh;
      return Promise.resolve(ok(undefined));
    },
    clear: () => {
      stored = undefined;
      return Promise.resolve(ok(undefined));
    },
  };

  return { persistence, stored: () => stored, saves: () => saves };
}

describe('TokenStore', () => {
  it('reads back what it was given, without touching storage', async () => {
    const store = createTokenStore(createEphemeralTokenPersistence());

    await store.write(tokens);

    await expect(store.read()).resolves.toEqual(tokens);
  });

  describe('with nothing persisted', () => {
    it('has no session after a simulated process restart', async () => {
      const persistence = createEphemeralTokenPersistence();
      await createTokenStore(persistence).write(tokens);

      await expect(createTokenStore(persistence).read()).resolves.toBeUndefined();
    });

    it('still serves the memory copy in-session, so a 401 refreshes without prompting', async () => {
      const store = createTokenStore(createEphemeralTokenPersistence());
      await store.write(tokens);

      await expect(store.read()).resolves.toEqual(tokens);
      await expect(store.read()).resolves.toEqual(tokens);
    });
  });

  describe('with a sealed persistence', () => {
    it('hands the refresh token to persistence on every write', async () => {
      const vault = sealed();

      await createTokenStore(vault.persistence).write(tokens);

      expect(vault.stored()).toBe('refresh-1');
    });

    it('reads nothing after a process restart until a rung restores the session', async () => {
      const vault = sealed();
      await createTokenStore(vault.persistence).write(tokens);

      await expect(createTokenStore(vault.persistence).read()).resolves.toBeUndefined();
    });

    it('reports a failed save instead of dropping it', async () => {
      const failing: TokenPersistence = {
        ...sealed().persistence,
        save: () => Promise.resolve(err(unknownError('keychain full'))),
      };
      const store = createTokenStore(failing);

      const written = await store.write(tokens);

      expect(written.ok).toBe(false);
      await expect(store.read()).resolves.toEqual(tokens);
    });
  });

  describe('restoring', () => {
    it('holds the refresh token with no access token', async () => {
      const store = createTokenStore(sealed().persistence);

      store.restore('refresh-9');

      await expect(store.read()).resolves.toEqual({ access: '', refresh: 'refresh-9' });
    });

    it('persists nothing and notifies nobody', async () => {
      const vault = sealed();
      const store = createTokenStore(vault.persistence);
      const seen: AuthTokens[] = [];
      store.onTokensPersisted((next) => seen.push(next));

      store.restore('refresh-9');

      expect(vault.saves()).toBe(0);
      expect(seen).toEqual([]);
    });
  });

  describe('locking', () => {
    it('drops the in-memory copy and leaves the sealed one', async () => {
      const vault = sealed();
      const store = createTokenStore(vault.persistence);
      await store.write(tokens);

      store.lock();

      await expect(store.read()).resolves.toBeUndefined();
      expect(vault.stored()).toBe('refresh-1');
    });

    it('leaves an ephemeral session with nothing at all', async () => {
      const store = createTokenStore(createEphemeralTokenPersistence());
      await store.write(tokens);

      store.lock();

      await expect(store.read()).resolves.toBeUndefined();
    });
  });

  describe('clearing', () => {
    it('removes both the memory copy and what was persisted', async () => {
      const vault = sealed();
      const store = createTokenStore(vault.persistence);
      await store.write(tokens);

      await store.clear();

      await expect(store.read()).resolves.toBeUndefined();
      expect(vault.stored()).toBeUndefined();
    });
  });

  describe('persist notifications', () => {
    it('notifies on every write', async () => {
      const store = createTokenStore(createEphemeralTokenPersistence());
      const seen: AuthTokens[] = [];
      store.onTokensPersisted((next) => seen.push(next));

      await store.write(tokens);
      await store.write({ access: 'access-2', refresh: 'refresh-2' });

      expect(seen).toHaveLength(2);
    });

    it('stops notifying once unsubscribed', async () => {
      const store = createTokenStore(createEphemeralTokenPersistence());
      const seen: AuthTokens[] = [];
      const unsubscribe = store.onTokensPersisted((next) => seen.push(next));

      unsubscribe();
      await store.write(tokens);

      expect(seen).toHaveLength(0);
    });
  });
});
