import * as Keychain from 'react-native-keychain';
import { fromUnknown, promptCancelled, unknownError } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import {
  MAX_SECURE_VALUE_BYTES,
  type SecureStorage,
  type SecureStorageOptions,
} from './secure-storage';

export function createSecureStorage(): SecureStorage {
  return {
    async get(key, options) {
      try {
        const entry = await Keychain.getGenericPassword({
          service: key,
          ...accessOptions(options),
        });

        return ok(entry === false ? undefined : entry.password);
      } catch (cause) {
        return err(isCancelledPrompt(cause) ? promptCancelled(cause) : fromUnknown(cause));
      }
    },

    async set(key, value, options) {
      const size = byteLength(value);
      if (size > MAX_SECURE_VALUE_BYTES) {
        return err(
          unknownError(
            `"${key}" is ${size} bytes, over the ${MAX_SECURE_VALUE_BYTES}-byte keychain limit. Store it in KeyValueStorage instead.`,
          ),
        );
      }

      try {
        await Keychain.setGenericPassword(key, value, { service: key, ...accessOptions(options) });
        return ok(undefined);
      } catch (cause) {
        return err(fromUnknown(cause));
      }
    },

    async remove(key) {
      try {
        await Keychain.resetGenericPassword({ service: key });
        return ok(undefined);
      } catch (cause) {
        return err(fromUnknown(cause));
      }
    },
  };
}

function accessOptions(options: SecureStorageOptions | undefined) {
  if (options?.requireBiometrics !== true) {
    return { accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
  }

  return {
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    ...(options.promptMessage === undefined
      ? {}
      : { authenticationPrompt: { title: options.promptMessage } }),
  };
}

function isCancelledPrompt(cause: unknown): boolean {
  if (!(cause instanceof Error)) return false;

  const code = (cause as Error & { code?: unknown }).code;
  if (code === '-128') return true;

  return /^code: (5|10|13),/.test(cause.message);
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}
