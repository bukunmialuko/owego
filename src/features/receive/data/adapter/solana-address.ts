import { ed25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { concatBytes } from '@noble/hashes/utils.js';
import { getBase58Decoder, getBase58Encoder, getBase64Encoder } from '@solana/kit';

const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const ASSOCIATED_TOKEN_PROGRAM = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
const PDA_MARKER = Uint8Array.from('ProgramDerivedAddress', (char) => char.charCodeAt(0));
const ADDRESS_BYTES = 32;

export function findAssociatedTokenAddress(owner: string, mint: string): string | undefined {
  const seeds = [owner, TOKEN_PROGRAM, mint].map(addressBytes);
  const program = addressBytes(ASSOCIATED_TOKEN_PROGRAM);
  if (program === undefined || seeds.some((seed) => seed === undefined)) return undefined;

  const prefix = concatBytes(...(seeds as Uint8Array[]));
  for (let bump = 255; bump >= 0; bump -= 1) {
    const candidate = sha256(concatBytes(prefix, new Uint8Array([bump]), program, PDA_MARKER));
    if (!isOnCurve(candidate)) return getBase58Decoder().decode(candidate);
  }
  return undefined;
}

export function base64ToBase58(value: string, byteLength: 32 | 64): string | undefined {
  const bytes = attempt(() => getBase64Encoder().encode(value));
  return bytes?.length === byteLength ? getBase58Decoder().decode(bytes) : undefined;
}

function addressBytes(address: string): Uint8Array | undefined {
  const bytes = attempt(() => getBase58Encoder().encode(address));
  return bytes?.length === ADDRESS_BYTES ? new Uint8Array(bytes) : undefined;
}

function isOnCurve(bytes: Uint8Array): boolean {
  return attempt(() => ed25519.Point.fromBytes(bytes, true)) !== undefined;
}

function attempt<T>(read: () => T): T | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
}
