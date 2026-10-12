import {
  decompileTransactionMessage,
  getBase64Encoder,
  getCompiledTransactionMessageDecoder,
  getTransactionDecoder,
} from '@solana/kit';
import {
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  parseCreateAssociatedTokenIdempotentInstruction,
  parseTransferCheckedInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from '@solana-program/token';
import type { DepositTransfer, RecentBlockhash } from '../../domain/entity/external-deposit';
import { findAssociatedTokenAddress } from './solana-address';
import { buildDepositTransaction } from './solana-deposit-transaction';
import type * as BuilderModule from './solana-deposit-transaction';

const SOURCE = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';
const CIRCLE = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin';
const USDC_DEVNET = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';

const TRANSFER: DepositTransfer = {
  token: { symbol: 'USDC', mint: USDC_DEVNET, decimals: 6 },
  source: SOURCE,
  destination: CIRCLE,
  amount: 12_340_000n,
};
const BLOCKHASH: RecentBlockhash = {
  blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
  lastValidBlockHeight: 300n,
  minContextSlot: 250n,
};

const GOLDEN =
  'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAUI8yOoTixuf6yxDAUhDMZAlobTA0Py+4DU5Xf345rO+mYq6jpQKL+8dWrycVN5Ro/QaC+MsU78u51//eKymMTBFkAOeRM84kLhtDQ8QPDDcuJddXR6YewIq9kRiBUlC9q9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7RCyzkSFX8TqTPQE0KC0DK1/+zQGi2/G3eQYI3wAup4UPLW4CpHr4JNCatp3ELXDLKMv6JJ+37le50lbBJ2LvjJclj04kifG7PRApFI4NgwtaE5na/xCEBI572Nvp+FkG3fbh12Whk9nL4UbO63msHLSF7V9bN5E6jPWFfv8AqcxJDpKM0uOHO7ND/JXaMxecpg9Nv0bCw26RKZ1V1Oa5AgYGAAIFBAMHAQEHBAEEAgAKDCBLvAAAAAAABg==';

function decode(base64: string) {
  const transaction = getTransactionDecoder().decode(getBase64Encoder().encode(base64));
  const compiled = getCompiledTransactionMessageDecoder().decode(transaction.messageBytes);
  return { transaction, message: decompileTransactionMessage(compiled) };
}

function built(): string {
  const base64 = buildDepositTransaction(TRANSFER, BLOCKHASH);
  if (base64 === undefined) throw new Error('expected a transaction');
  return base64;
}

describe('buildDepositTransaction', () => {
  it('leaves the external wallet the only signature to add, as the one paying the fee', () => {
    const { transaction, message } = decode(built());

    expect(transaction.signatures).toEqual({ [SOURCE]: null });
    expect(message.feePayer.address).toBe(SOURCE);
  });

  it('signs against the blockhash it was given', () => {
    const { message } = decode(built());

    expect(message.lifetimeConstraint).toEqual(
      expect.objectContaining({ blockhash: BLOCKHASH.blockhash }),
    );
  });

  it('carries exactly two instructions: open the destination account, then transfer', () => {
    const { message } = decode(built());

    const instructions: readonly { programAddress: string }[] = message.instructions;

    expect(instructions.map((instruction) => instruction.programAddress)).toEqual([
      ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
      TOKEN_PROGRAM_ADDRESS,
    ]);
  });

  it("opens the Circle wallet's account for the mint, paid for by the external wallet", () => {
    const { message } = decode(built());
    const [create] = message.instructions;
    if (create === undefined) throw new Error('expected an instruction');

    const { accounts } = parseCreateAssociatedTokenIdempotentInstruction({
      ...create,
      accounts: create.accounts ?? [],
      data: create.data ?? new Uint8Array(),
    });

    expect({
      payer: accounts.payer.address,
      ata: accounts.ata.address,
      owner: accounts.owner.address,
      mint: accounts.mint.address,
      tokenProgram: accounts.tokenProgram.address,
    }).toEqual({
      payer: SOURCE,
      ata: findAssociatedTokenAddress(CIRCLE, USDC_DEVNET),
      owner: CIRCLE,
      mint: USDC_DEVNET,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });
  });

  it('transfers exactly the amount, in the mint and its decimals, from the external wallet to the Circle wallet', () => {
    const { message } = decode(built());
    const transfer = message.instructions[1];
    if (transfer === undefined) throw new Error('expected an instruction');

    const { accounts, data } = parseTransferCheckedInstruction({
      ...transfer,
      accounts: transfer.accounts ?? [],
      data: transfer.data ?? new Uint8Array(),
    });

    expect({
      source: accounts.source.address,
      mint: accounts.mint.address,
      destination: accounts.destination.address,
      authority: accounts.authority.address,
      amount: data.amount,
      decimals: data.decimals,
    }).toEqual({
      source: findAssociatedTokenAddress(SOURCE, USDC_DEVNET),
      mint: USDC_DEVNET,
      destination: findAssociatedTokenAddress(CIRCLE, USDC_DEVNET),
      authority: SOURCE,
      amount: 12_340_000n,
      decimals: 6,
    });
  });

  it('produces exactly the bytes pinned for this transfer', () => {
    expect(built()).toBe(GOLDEN);
  });

  it.each([
    ['a source that is not an address', { ...TRANSFER, source: 'nope' }, BLOCKHASH],
    ['a destination that is not an address', { ...TRANSFER, destination: 'nope' }, BLOCKHASH],
    [
      'a mint that is not an address',
      { ...TRANSFER, token: { ...TRANSFER.token, mint: 'nope' } },
      BLOCKHASH,
    ],
    ['a blockhash that is not one', TRANSFER, { ...BLOCKHASH, blockhash: 'nope' }],
  ])('refuses %s', (_, transfer, blockhash) => {
    expect(buildDepositTransaction(transfer, blockhash)).toBeUndefined();
  });

  it('builds without crypto or TextDecoder, as on Hermes', () => {
    const missing = ['crypto', 'TextDecoder'] as const;
    const saved = missing.map(
      (name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const,
    );
    missing.forEach((name) => {
      Object.defineProperty(globalThis, name, {
        value: undefined,
        configurable: true,
        writable: true,
      });
    });

    try {
      jest.isolateModules(() => {
        const isolated = jest.requireActual<typeof BuilderModule>('./solana-deposit-transaction');
        expect(isolated.buildDepositTransaction(TRANSFER, BLOCKHASH)).toBe(built());
      });
    } finally {
      saved.forEach(([name, descriptor]) => {
        if (descriptor !== undefined) Object.defineProperty(globalThis, name, descriptor);
      });
    }
  });
});
