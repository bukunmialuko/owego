import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import type { AppError } from '@/core/errors/app-error';
import { ok, type Result } from '@/core/result/result';
import type { PinKdf } from './pin-kdf';
import type { SecureRandom } from './secure-random';

const VERSION = 'v1';
const SALT_BYTES = 16;
const NONCE_BYTES = 24;
const AAD = utf8ToBytes('owego/pin-seal/v1');

export type PinOpenOutcome =
  { type: 'opened'; secret: Uint8Array } | { type: 'wrong-pin' } | { type: 'malformed' };

export async function sealUnderPin(
  secret: Uint8Array,
  pin: string,
  random: SecureRandom,
  kdf: PinKdf,
): Promise<Result<string, AppError>> {
  const salt = random(SALT_BYTES);
  const nonce = random(NONCE_BYTES);
  const key = await kdf(pin, salt);
  if (!key.ok) return key;

  const ciphertext = xchacha20poly1305(key.value, nonce, AAD).encrypt(secret);

  return ok([VERSION, bytesToHex(salt), bytesToHex(nonce), bytesToHex(ciphertext)].join('.'));
}

export async function openUnderPin(
  sealed: string,
  pin: string,
  kdf: PinKdf,
): Promise<Result<PinOpenOutcome, AppError>> {
  const parts = sealed.split('.');
  if (parts.length !== 4 || parts[0] !== VERSION) return ok({ type: 'malformed' });

  let salt: Uint8Array;
  let nonce: Uint8Array;
  let ciphertext: Uint8Array;
  try {
    const [, saltHex = '', nonceHex = '', ciphertextHex = ''] = parts;
    salt = hexToBytes(saltHex);
    nonce = hexToBytes(nonceHex);
    ciphertext = hexToBytes(ciphertextHex);
  } catch {
    return ok({ type: 'malformed' });
  }
  if (nonce.length !== NONCE_BYTES) return ok({ type: 'malformed' });

  const key = await kdf(pin, salt);
  if (!key.ok) return key;

  try {
    return ok({
      type: 'opened',
      secret: xchacha20poly1305(key.value, nonce, AAD).decrypt(ciphertext),
    });
  } catch {
    return ok({ type: 'wrong-pin' });
  }
}
