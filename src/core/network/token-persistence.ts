import type { AppError } from '@/core/errors/app-error';
import { ok, type Result } from '@/core/result/result';

export interface TokenPersistence {
  persists(): Promise<boolean>;
  save(refreshToken: string): Promise<Result<void, AppError>>;
  clear(): Promise<Result<void, AppError>>;
}

export function createEphemeralTokenPersistence(): TokenPersistence {
  return {
    persists: () => Promise.resolve(false),
    save: () => Promise.resolve(ok(undefined)),
    clear: () => Promise.resolve(ok(undefined)),
  };
}
