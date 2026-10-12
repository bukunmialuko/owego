import type { SolanaCluster } from '@/core/config/app-config';
import { unknownError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type {
  DepositSubmission,
  DepositTransfer,
  RecentBlockhash,
} from '../entity/external-deposit';
import type { ExternalWalletAccount } from '../entity/external-wallet';
import type { ExternalWalletPort } from '../port/external-wallet-port';
import type { SolanaWalletAddressPort } from '../port/solana-wallet-address-port';
import type { SolanaNetworkRepository } from '../repository/solana-network-repository';
import {
  createSubmitExternalDepositUseCase,
  type ExternalDepositRequest,
} from './submit-external-deposit-usecase';

const CIRCLE_ADDRESS = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin';
const ACCOUNT: ExternalWalletAccount = {
  address: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
  authToken: 'auth-token',
};
const BLOCKHASH: RecentBlockhash = {
  blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
  lastValidBlockHeight: 300n,
  minContextSlot: 250n,
};

function request(overrides: Partial<ExternalDepositRequest> = {}): ExternalDepositRequest {
  return { account: ACCOUNT, tokenSymbol: 'USDC', amountMinor: 1234, ...overrides };
}

function setUp({
  cluster = 'devnet',
  destination = ok(CIRCLE_ADDRESS),
  blockhash = ok(BLOCKHASH),
  answer = ok({ type: 'submitted', signature: 'sig' }),
}: {
  cluster?: SolanaCluster;
  destination?: Result<string | undefined, AppError>;
  blockhash?: Result<RecentBlockhash, AppError>;
  answer?: Result<DepositSubmission, AppError>;
} = {}) {
  const calls: string[] = [];
  const sent: {
    account: ExternalWalletAccount;
    transfer: DepositTransfer;
    blockhash: RecentBlockhash;
  }[] = [];

  const solanaWalletAddressPort: SolanaWalletAddressPort = {
    getSolanaAddress: async () => {
      calls.push('destination');
      return destination;
    },
  };
  const solanaNetworkRepository: SolanaNetworkRepository = {
    getRecentBlockhash: async () => {
      calls.push('blockhash');
      return blockhash;
    },
    getTokenBalance: async () => ok(0n),
    getSignatureStatus: async () => ok({ type: 'unknown' }),
  };
  const externalWalletPort: ExternalWalletPort = {
    connect: async () => ok({ type: 'failed', reason: 'unsupported' }),
    signAndSend: async (account, transfer, recent) => {
      calls.push('wallet');
      sent.push({ account, transfer, blockhash: recent });
      return answer;
    },
  };

  const useCase = createSubmitExternalDepositUseCase({
    cluster,
    solanaWalletAddressPort,
    solanaNetworkRepository,
    externalWalletPort,
  });

  return { useCase, calls, sent };
}

describe('submitExternalDeposit', () => {
  it("hands the wallet exactly the typed amount, in the token's mint, from the connected wallet to the user's Circle address", async () => {
    const { useCase, sent } = setUp();

    await useCase.execute(request({ amountMinor: 1234 }));

    expect(sent).toEqual([
      {
        account: ACCOUNT,
        transfer: {
          token: {
            symbol: 'USDC',
            mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
            decimals: 6,
          },
          source: ACCOUNT.address,
          destination: CIRCLE_ADDRESS,
          amount: 12_340_000n,
        },
        blockhash: BLOCKHASH,
      },
    ]);
  });

  it('deposits USDT at its mainnet mint on a mainnet build', async () => {
    const { useCase, sent } = setUp({ cluster: 'mainnet-beta' });

    await useCase.execute(request({ tokenSymbol: 'USDT', amountMinor: 500 }));

    expect(sent[0]?.transfer.token.mint).toBe('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
    expect(sent[0]?.transfer.amount).toBe(5_000_000n);
  });

  it('returns what the wallet answered, having asked it once', async () => {
    const { useCase, calls } = setUp({ answer: ok({ type: 'notSent', reason: 'declined' }) });

    const result = await useCase.execute(request());

    expect(result).toEqual(ok({ type: 'notSent', reason: 'declined' }));
    expect(calls.filter((call) => call === 'wallet')).toHaveLength(1);
  });

  it('reads the destination and the blockhash before opening the wallet', async () => {
    const { useCase, calls } = setUp();

    await useCase.execute(request());

    expect(calls).toEqual(['destination', 'blockhash', 'wallet']);
  });

  it('refuses USDT on devnet, where it has no mint, without opening the wallet', async () => {
    const { useCase, calls } = setUp();

    const result = await useCase.execute(request({ tokenSymbol: 'USDT' }));

    expect(result).toEqual(ok({ type: 'notSent', reason: 'invalidRequest' }));
    expect(calls).toEqual([]);
  });

  it.each([
    ['zero', 0],
    ['a negative amount', -1],
    ['a fraction of a cent', 0.5],
  ])('refuses %s without opening the wallet', async (_, amountMinor) => {
    const { useCase, calls } = setUp();

    const result = await useCase.execute(request({ amountMinor }));

    expect(result).toEqual(ok({ type: 'notSent', reason: 'invalidRequest' }));
    expect(calls).toEqual([]);
  });

  it('says there is nowhere to deposit to when the account has no Solana wallet', async () => {
    const { useCase, calls } = setUp({ destination: ok(undefined) });

    const result = await useCase.execute(request());

    expect(result).toEqual(ok({ type: 'notSent', reason: 'noDestination' }));
    expect(calls).not.toContain('wallet');
  });

  it('passes on a failure to read the destination, without opening the wallet', async () => {
    const failure = unknownError('wallets unavailable');
    const { useCase, calls } = setUp({ destination: err(failure) });

    const result = await useCase.execute(request());

    expect(result).toEqual(err(failure));
    expect(calls).not.toContain('wallet');
  });

  it('refuses to deposit from a wallet into itself', async () => {
    const { useCase, calls } = setUp({ destination: ok(ACCOUNT.address) });

    const result = await useCase.execute(request());

    expect(result).toEqual(ok({ type: 'notSent', reason: 'invalidRequest' }));
    expect(calls).not.toContain('wallet');
  });

  it('never opens the wallet without a blockhash to sign against', async () => {
    const failure = unknownError('rpc down');
    const { useCase, calls } = setUp({ blockhash: err(failure) });

    const result = await useCase.execute(request());

    expect(result).toEqual(err(failure));
    expect(calls).not.toContain('wallet');
  });
});
