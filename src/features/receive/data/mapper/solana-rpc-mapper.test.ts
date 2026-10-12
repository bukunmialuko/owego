import { toRecentBlockhash, toSignatureStatus, toTokenBalance } from './solana-rpc-mapper';

const USDC = {
  symbol: 'USDC',
  mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  decimals: 6,
} as const;

function account(mint: string, amount: string, decimals: number) {
  return { data: { parsed: { info: { mint, owner: 'o', tokenAmount: { amount, decimals } } } } };
}

describe('toRecentBlockhash', () => {
  it('keeps the slot it was read at, so the wallet does not simulate against an older one', () => {
    expect(
      toRecentBlockhash({
        context: { slot: 250 },
        value: {
          blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
          lastValidBlockHeight: 300,
        },
      }),
    ).toEqual({
      blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
      lastValidBlockHeight: 300n,
      minContextSlot: 250n,
    });
  });
});

describe('toTokenBalance', () => {
  it('reads the balance in base units, past what a number holds exactly', () => {
    expect(toTokenBalance(account(USDC.mint, '90071992547400001', 6), USDC)).toEqual({
      ok: true,
      value: 90_071_992_547_400_001n,
    });
  });

  it('reads an account that does not exist as an empty balance', () => {
    expect(toTokenBalance(null, USDC)).toEqual({ ok: true, value: 0n });
  });

  it.each([
    ['another mint', account('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', '5', 6)],
    ['other decimals', account(USDC.mint, '5', 9)],
  ])('refuses an account holding %s, rather than show it as this token', (_, dto) => {
    expect(toTokenBalance(dto, USDC).ok).toBe(false);
  });
});

describe('toSignatureStatus', () => {
  it('reads a signature the cluster has not seen as unknown', () => {
    expect(toSignatureStatus(null)).toEqual({ type: 'unknown' });
  });

  it.each(['processed', 'confirmed', 'finalized'] as const)('reads %s', (commitment) => {
    expect(toSignatureStatus({ err: null, confirmationStatus: commitment })).toEqual({
      type: 'landed',
      commitment,
      failed: false,
    });
  });

  it('reads an instruction error as a failure', () => {
    expect(
      toSignatureStatus({ err: { InstructionError: [1, 'x'] }, confirmationStatus: 'confirmed' }),
    ).toEqual({ type: 'landed', commitment: 'confirmed', failed: true });
  });

  it('reads a status without a commitment as only processed', () => {
    expect(toSignatureStatus({ err: null, confirmationStatus: null })).toEqual({
      type: 'landed',
      commitment: 'processed',
      failed: false,
    });
  });
});
