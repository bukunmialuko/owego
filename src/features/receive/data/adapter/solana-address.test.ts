import { sha256 } from '@noble/hashes/sha2.js';
import { getBase58Decoder, type Address } from '@solana/kit';
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';
import { base64ToBase58, findAssociatedTokenAddress } from './solana-address';

const USDC_DEVNET = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
const USDC_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

function owners(count: number): string[] {
  const base58 = getBase58Decoder();
  return Array.from({ length: count }, (_, index) =>
    base58.decode(sha256(new Uint8Array([index, 7, 42]))),
  );
}

async function libraryAta(owner: string, mint: string): Promise<string> {
  const [ata] = await findAssociatedTokenPda({
    owner: owner as Address,
    mint: mint as Address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });
  return ata;
}

describe('findAssociatedTokenAddress', () => {
  it.each([
    ['devnet USDC', USDC_DEVNET],
    ['mainnet USDC', USDC_MAINNET],
  ])("agrees with the token program's own derivation for %s", async (_, mint) => {
    for (const owner of owners(50)) {
      expect(findAssociatedTokenAddress(owner, mint)).toBe(await libraryAta(owner, mint));
    }
  });

  it('derives without a global crypto, as on Hermes', async () => {
    const [owner] = owners(1) as [string];
    const expected = await libraryAta(owner, USDC_DEVNET);
    const restore = jest.replaceProperty(globalThis, 'crypto', undefined as unknown as Crypto);

    try {
      expect(findAssociatedTokenAddress(owner, USDC_DEVNET)).toBe(expected);
    } finally {
      restore.restore();
    }
  });

  it.each([
    ['an owner that is not base58', '0OIl', USDC_DEVNET],
    ['an owner of the wrong length', '1111', USDC_DEVNET],
    ['a mint that is not base58', owners(1)[0] as string, 'not-a-mint'],
  ])('refuses %s', (_, owner, mint) => {
    expect(findAssociatedTokenAddress(owner, mint)).toBeUndefined();
  });
});

describe('base64ToBase58', () => {
  it('turns a 32-byte key from the wallet into the address everything else names', () => {
    expect(base64ToBase58('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', 32)).toBe(
      '11111111111111111111111111111111',
    );
  });

  it('turns a 64-byte signature into its base58 form', () => {
    expect(base64ToBase58(Buffer.alloc(64, 1).toString('base64'), 64)).toBe(
      getBase58Decoder().decode(new Uint8Array(64).fill(1)),
    );
  });

  it.each([
    ['a key of the wrong length', Buffer.alloc(31).toString('base64'), 32],
    ['a signature of the wrong length', Buffer.alloc(32).toString('base64'), 64],
    ['text that is not base64', '***', 32],
    ['nothing at all', '', 32],
  ] as const)('refuses %s', (_, value, length) => {
    expect(base64ToBase58(value, length)).toBeUndefined();
  });
});
