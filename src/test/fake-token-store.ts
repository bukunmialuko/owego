import type { AuthTokens, TokenStore } from '@/core/network/auth-tokens';
import { ok } from '@/core/result/result';

export type FakeTokenStore = TokenStore & {
  readonly current: AuthTokens | undefined;
};

export function createFakeTokenStore(initial?: AuthTokens): FakeTokenStore {
  let tokens = initial;
  const listeners = new Set<(next: AuthTokens) => void>();

  return {
    get current() {
      return tokens;
    },
    read: () => Promise.resolve(tokens),
    write: (next) => {
      tokens = next;
      for (const listener of listeners) listener(next);
      return Promise.resolve(ok(undefined));
    },
    restore: (refresh) => {
      tokens = { access: '', refresh };
    },
    clear: () => {
      tokens = undefined;
      return Promise.resolve();
    },
    lock: () => {
      tokens = undefined;
    },
    onTokensPersisted: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
