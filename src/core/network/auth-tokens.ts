import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type { TokenPersistence } from './token-persistence';

export type AuthTokens = {
  access: string;
  refresh: string;
};

export interface TokenStore {
  read(): Promise<AuthTokens | undefined>;
  write(tokens: AuthTokens): Promise<Result<void, AppError>>;
  restore(refreshToken: string): void;
  clear(): Promise<void>;
  lock(): void;
  onTokensPersisted(listener: (tokens: AuthTokens) => void): () => void;
}

export function createTokenStore(persistence: TokenPersistence): TokenStore {
  let memory: AuthTokens | undefined;
  const listeners = new Set<(tokens: AuthTokens) => void>();

  return {
    read() {
      return Promise.resolve(memory);
    },

    async write(tokens) {
      memory = tokens;
      const saved = await persistence.save(tokens.refresh);

      for (const listener of listeners) listener(tokens);

      return saved;
    },

    restore(refreshToken) {
      memory = { access: '', refresh: refreshToken };
    },

    async clear() {
      memory = undefined;
      await persistence.clear();
    },

    lock() {
      memory = undefined;
    },

    onTokensPersisted(listener) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
  };
}
