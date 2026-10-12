import { utf8ToBytes } from '@noble/hashes/utils.js';
import { scrypt } from 'react-native-quick-crypto';
import { unknownError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';

export const PIN_KDF = { N: 2 ** 14, r: 8, p: 1, keyLength: 32 } as const;

const MAX_MEMORY = 32 * 1024 * 1024;

export type PinKdf = (pin: string, salt: Uint8Array) => Promise<Result<Uint8Array, AppError>>;

export const derivePinKey: PinKdf = (pin, salt) =>
  new Promise((resolve) => {
    try {
      scrypt(
        utf8ToBytes(pin),
        salt,
        PIN_KDF.keyLength,
        { N: PIN_KDF.N, r: PIN_KDF.r, p: PIN_KDF.p, maxmem: MAX_MEMORY },
        (error, key) => {
          resolve(
            error === null && key !== undefined
              ? ok(new Uint8Array(key))
              : err(unknownError('Could not derive a key from the pin.', error)),
          );
        },
      );
    } catch (cause) {
      resolve(err(unknownError('Could not derive a key from the pin.', cause)));
    }
  });
