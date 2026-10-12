import { offline, serverError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { Wallet, WalletBalancePort } from '@/core/wallet/wallet';
import type { TransferChallenge, TransferChallengeRequest } from '../entity/transfer-challenge';
import type { TransferSigningOutcome, TransferSigningPort } from '../port/transfer-signing-port';
import type { TransferChallengeRepository } from '../repository/transfer-challenge-repository';
import { createSendAssetUseCase, type SendAssetRequest } from './send-asset-usecase';

const SOLANA_ADDRESS = 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1';
const EVM_ADDRESS = '0xb249111111111111111111111111111111113901';

const BASE_WALLET: Wallet = {
  id: 'base-wallet',
  address: EVM_ADDRESS,
  blockchain: 'BASE-SEPOLIA',
  balances: [{ tokenId: 'usdc-base', symbol: 'USDC', amount: '900', decimals: 6 }],
};

const SOLANA_WALLET: Wallet = {
  id: 'sol-wallet',
  address: 'own-solana-address',
  blockchain: 'SOL-DEVNET',
  balances: [
    { tokenId: 'usdc-sol', symbol: 'USDC', amount: '5.136', decimals: 6 },
    { tokenId: 'usdt-sol', symbol: 'USDT', amount: '12.5', decimals: 6 },
  ],
};

const CHALLENGE: TransferChallenge = {
  challengeId: 'chal_1',
  userToken: 'utok_1',
  encryptionKey: 'key_1',
};

const SIGNED: TransferSigningOutcome = {
  type: 'settled',
  status: 'complete',
  resultType: 'transaction',
};

function walletsReturning(result: Result<Wallet[], AppError> = ok([BASE_WALLET, SOLANA_WALLET])) {
  const port: WalletBalancePort = { listWallets: jest.fn(() => Promise.resolve(result)) };
  return port;
}

function recordingRepository(result: Result<TransferChallenge, AppError> = ok(CHALLENGE)) {
  const requests: TransferChallengeRequest[] = [];
  const repository: TransferChallengeRepository = {
    create: (request) => {
      requests.push(request);
      return Promise.resolve(result);
    },
  };

  return { repository, requests };
}

function recordingSigner(result: Result<TransferSigningOutcome, AppError> = ok(SIGNED)) {
  const challenges: TransferChallenge[] = [];
  const signer: TransferSigningPort = {
    sign: (challenge) => {
      challenges.push(challenge);
      return Promise.resolve(result);
    },
  };

  return { signer, challenges };
}

function request(overrides: Partial<SendAssetRequest> = {}): SendAssetRequest {
  return {
    networkCode: 'SOL',
    tokenSymbol: 'USDT',
    destinationAddress: SOLANA_ADDRESS,
    amountMinor: 10,
    ...overrides,
  };
}

function build({
  wallets = walletsReturning(),
  challenge = recordingRepository(),
  signing = recordingSigner(),
  signingTimeoutMs,
}: {
  wallets?: WalletBalancePort;
  challenge?: ReturnType<typeof recordingRepository>;
  signing?: ReturnType<typeof recordingSigner>;
  signingTimeoutMs?: number;
} = {}) {
  const useCase = createSendAssetUseCase({
    walletBalancePort: wallets,
    transferChallengeRepository: challenge.repository,
    transferSigningPort: signing.signer,
    ...(signingTimeoutMs === undefined ? {} : { signingTimeoutMs }),
  });

  return { useCase, requests: challenge.requests, challenges: signing.challenges };
}

describe('send asset use case', () => {
  it('creates the challenge from the Solana wallet with the chosen token’s id, the exact amount and the trimmed address', async () => {
    const { useCase, requests } = build();

    await useCase.execute(request({ destinationAddress: `  ${SOLANA_ADDRESS}\n` }));

    expect(requests).toEqual([
      {
        walletId: 'sol-wallet',
        tokenId: 'usdt-sol',
        destinationAddress: SOLANA_ADDRESS,
        amountMinor: 10,
      },
    ]);
  });

  it('pays USDC from the USDC row of the same wallet', async () => {
    const { useCase, requests } = build();

    await useCase.execute(request({ tokenSymbol: 'USDC', amountMinor: 500 }));

    expect(requests).toEqual([
      {
        walletId: 'sol-wallet',
        tokenId: 'usdc-sol',
        destinationAddress: SOLANA_ADDRESS,
        amountMinor: 500,
      },
    ]);
  });

  it('hands the created challenge to the signer unchanged, once', async () => {
    const { useCase, challenges } = build();

    await useCase.execute(request());

    expect(challenges).toEqual([CHALLENGE]);
  });

  it('reports what the signed challenge means', async () => {
    const { useCase } = build();

    await expect(useCase.execute(request())).resolves.toEqual(ok({ type: 'sent' }));
  });

  it('never retries a challenge Circle refused', async () => {
    const signing = recordingSigner(ok({ type: 'failed', reason: 'challenge-invalid' }));
    const { useCase, requests, challenges } = build({ signing });

    const result = await useCase.execute(request());

    expect(result).toEqual(ok({ type: 'notSent', reason: 'failed' }));
    expect(requests).toHaveLength(1);
    expect(challenges).toHaveLength(1);
  });

  it('may spend the whole floored balance', async () => {
    const { useCase, requests } = build();

    await useCase.execute(request({ tokenSymbol: 'USDC', amountMinor: 513 }));

    expect(requests).toHaveLength(1);
  });

  describe('refuses without creating a challenge', () => {
    it.each<[string, Partial<SendAssetRequest>, string]>([
      ['a token this flow does not send', { tokenSymbol: 'SOL' }, 'invalidRequest'],
      ['a network it does not send over', { networkCode: 'BASE' }, 'invalidRequest'],
      ['an EVM address on Solana', { destinationAddress: EVM_ADDRESS }, 'invalidRequest'],
      ['a blank address', { destinationAddress: '   ' }, 'invalidRequest'],
      ['a zero amount', { amountMinor: 0 }, 'invalidRequest'],
      ['a negative amount', { amountMinor: -1 }, 'invalidRequest'],
      ['a fractional number of cents', { amountMinor: 1.5 }, 'invalidRequest'],
      [
        'one cent over a fractional balance',
        { tokenSymbol: 'USDC', amountMinor: 514 },
        'insufficientBalance',
      ],
      ['more than the balance', { amountMinor: 1251 }, 'insufficientBalance'],
    ])('%s', async (_case, overrides, reason) => {
      const { useCase, requests, challenges } = build();

      const result = await useCase.execute(request(overrides));

      expect(result).toEqual(ok({ type: 'notSent', reason }));
      expect(requests).toHaveLength(0);
      expect(challenges).toHaveLength(0);
    });

    it.each(['1e3', '', '-5', 'NaN'])('when the balance reads %p', async (amount) => {
      const malformed: Wallet = {
        ...SOLANA_WALLET,
        balances: [{ tokenId: 'usdc-sol', symbol: 'USDC', amount, decimals: 6 }],
      };
      const { useCase, requests } = build({ wallets: walletsReturning(ok([malformed])) });

      const result = await useCase.execute(request({ tokenSymbol: 'USDC', amountMinor: 1 }));

      expect(result).toEqual(ok({ type: 'notSent', reason: 'insufficientBalance' }));
      expect(requests).toHaveLength(0);
    });

    it('when the wallet holds no row for the token', async () => {
      const usdcOnly: Wallet = {
        ...SOLANA_WALLET,
        balances: SOLANA_WALLET.balances.filter((balance) => balance.symbol === 'USDC'),
      };
      const { useCase, requests } = build({ wallets: walletsReturning(ok([usdcOnly])) });

      const result = await useCase.execute(request({ tokenSymbol: 'USDT' }));

      expect(result).toEqual(ok({ type: 'notSent', reason: 'insufficientBalance' }));
      expect(requests).toHaveLength(0);
    });
  });

  it('returns the error without signing when the challenge cannot be created', async () => {
    const challenge = recordingRepository(err(serverError(400, 'walletId not found')));
    const { useCase, challenges } = build({ challenge });

    const result = await useCase.execute(request());

    expect(result).toEqual(err(serverError(400, 'walletId not found')));
    expect(challenges).toHaveLength(0);
  });

  it('returns the error without creating a challenge when the wallets cannot be read', async () => {
    const { useCase, requests } = build({ wallets: walletsReturning(err(offline())) });

    const result = await useCase.execute(request());

    expect(result).toEqual(err(offline()));
    expect(requests).toHaveLength(0);
  });

  it('reads a signature that never answers as unconfirmed once the bound has passed', async () => {
    jest.useFakeTimers();
    try {
      const signer: TransferSigningPort = { sign: () => new Promise(() => undefined) };
      const { useCase } = build({
        signing: { signer, challenges: [] },
        signingTimeoutMs: 1_000,
      });

      const pending = useCase.execute(request());
      await jest.advanceTimersByTimeAsync(1_000);

      await expect(pending).resolves.toEqual(ok({ type: 'unconfirmed' }));
    } finally {
      jest.useRealTimers();
    }
  });

  it('takes the signer’s answer when it arrives inside the bound', async () => {
    jest.useFakeTimers();
    try {
      const { useCase } = build({ signingTimeoutMs: 1_000 });

      const pending = useCase.execute(request());
      await jest.advanceTimersByTimeAsync(0);

      await expect(pending).resolves.toEqual(ok({ type: 'sent' }));
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });
});
