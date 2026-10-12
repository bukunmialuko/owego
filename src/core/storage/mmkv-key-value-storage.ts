import { createMMKV } from 'react-native-mmkv';
import type { ZodType } from 'zod';
import { fromZodError, unknownError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { KeyValueStorage } from './key-value-storage';

export function createKeyValueStorage(id: string, encryptionKey?: string): KeyValueStorage {
  const mmkv = createMMKV({ id, ...(encryptionKey === undefined ? {} : { encryptionKey }) });

  return {
    getString(key) {
      return mmkv.getString(key);
    },

    setString(key, value) {
      mmkv.set(key, value);
    },

    getObject<T>(key: string, schema: ZodType<T>): Result<T | undefined, AppError> {
      const raw = mmkv.getString(key);
      if (raw === undefined) return ok(undefined);

      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch (cause) {
        return err(unknownError(`Corrupted cache entry at "${key}".`, cause));
      }

      const parsed = schema.safeParse(json);
      return parsed.success ? ok(parsed.data) : err(fromZodError(parsed.error));
    },

    setObject(key, value) {
      mmkv.set(key, JSON.stringify(value));
    },

    remove(key) {
      mmkv.remove(key);
    },

    clearAll() {
      mmkv.clearAll();
    },
  };
}
