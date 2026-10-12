import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { x25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, concatBytes, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { unknownError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { SecureRandom } from './secure-random';

const VERSION = 'v1';
const KEY_BYTES = 32;
const NONCE_BYTES = 24;
const INFO = utf8ToBytes('owego/sealed-box/v1');

export type KeyPair = { secretKey: Uint8Array; publicKey: Uint8Array };

function publicKeyOf(secretKey: Uint8Array): Uint8Array {
  return x25519.scalarMult(secretKey, x25519.GuBytes);
}

export function generateKeyPair(random: SecureRandom): KeyPair {
  const secretKey = random(KEY_BYTES);

  return { secretKey, publicKey: publicKeyOf(secretKey) };
}

export function sealTo(
  publicKey: Uint8Array,
  plaintext: string,
  random: SecureRandom,
): Result<string, AppError> {
  try {
    const ephemeral = generateKeyPair(random);
    const key = derive(
      x25519.getSharedSecret(ephemeral.secretKey, publicKey),
      ephemeral,
      publicKey,
    );
    const nonce = random(NONCE_BYTES);
    const ciphertext = xchacha20poly1305(key, nonce).encrypt(utf8ToBytes(plaintext));

    return ok(
      [VERSION, bytesToHex(ephemeral.publicKey), bytesToHex(nonce), bytesToHex(ciphertext)].join(
        '.',
      ),
    );
  } catch (cause) {
    return err(unknownError('Could not seal to the stored public key.', cause));
  }
}

export function openWith(secretKey: Uint8Array, sealed: string): string | undefined {
  const parts = sealed.split('.');
  if (parts.length !== 4 || parts[0] !== VERSION) return undefined;

  try {
    const [, ephemeralHex = '', nonceHex = '', ciphertextHex = ''] = parts;
    const ephemeralPublic = hexToBytes(ephemeralHex);
    const recipientPublic = publicKeyOf(secretKey);
    const key = derive(
      x25519.getSharedSecret(secretKey, ephemeralPublic),
      { publicKey: ephemeralPublic },
      recipientPublic,
    );
    const opened = xchacha20poly1305(key, hexToBytes(nonceHex)).decrypt(hexToBytes(ciphertextHex));

    return new TextDecoder().decode(opened);
  } catch {
    return undefined;
  }
}

function derive(
  shared: Uint8Array,
  ephemeral: { publicKey: Uint8Array },
  recipientPublic: Uint8Array,
): Uint8Array {
  return hkdf(sha256, shared, concatBytes(ephemeral.publicKey, recipientPublic), INFO, KEY_BYTES);
}
