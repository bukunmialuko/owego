import { unknownError } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import { findAssociatedTokenAddress } from '../adapter/solana-address';
import type { SolanaRpcDataSource } from '../datasource/solana-rpc-datasource';
import { createSolanaNetworkRepositoryImpl } from './solana-network-repository-impl';

const OWNER = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';
const USDC = {
  symbol: 'USDC',
  mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  decimals: 6,
} as const;

function setUp(overrides: Partial<SolanaRpcDataSource> = {}) {
  const asked: string[] = [];
  const dataSource: SolanaRpcDataSource = {
    getLatestBlockhash: async () =>
      ok({
        context: { slot: 9 },
        value: {
          blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
          lastValidBlockHeight: 10,
        },
      }),
    getTokenAccount: async (address) => {
      asked.push(address);
      return ok({
        data: {
          parsed: {
            info: {
              mint: USDC.mint,
              owner: OWNER,
              tokenAmount: { amount: '2500000', decimals: 6 },
            },
          },
        },
      });
    },
    getSignatureStatus: async () => ok({ err: null, confirmationStatus: 'finalized' }),
    ...overrides,
  };
  return {
    repository: createSolanaNetworkRepositoryImpl({ solanaRpcDataSource: dataSource }),
    asked,
  };
}

describe('SolanaNetworkRepositoryImpl', () => {
  it("reads the balance of the owner's account for the mint, not the owner's own account", async () => {
    const { repository, asked } = setUp();

    expect(await repository.getTokenBalance(OWNER, USDC)).toEqual(ok(2_500_000n));
    expect(asked).toEqual([findAssociatedTokenAddress(OWNER, USDC.mint)]);
  });

  it('refuses an owner that is not an address without asking the cluster', async () => {
    const { repository, asked } = setUp();

    expect((await repository.getTokenBalance('nope', USDC)).ok).toBe(false);
    expect(asked).toEqual([]);
  });

  it('passes on a failed read', async () => {
    const failure = unknownError('down');
    const { repository } = setUp({ getTokenAccount: async () => err(failure) });

    expect(await repository.getTokenBalance(OWNER, USDC)).toEqual(err(failure));
  });

  it('returns the blockhash with the slot it was read at', async () => {
    const { repository } = setUp();

    expect(await repository.getRecentBlockhash()).toEqual(
      ok({
        blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
        lastValidBlockHeight: 10n,
        minContextSlot: 9n,
      }),
    );
  });

  it("returns a signature's status", async () => {
    const { repository } = setUp();

    expect(await repository.getSignatureStatus('sig')).toEqual(
      ok({ type: 'landed', commitment: 'finalized', failed: false }),
    );
  });
});
