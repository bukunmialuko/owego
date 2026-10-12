import { serverError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { CurrencyDto } from '@/core/reference-data/reference-data';
import type { Wallet, WalletBalancePort } from '@/core/wallet/wallet';
import type { CorridorSpec, FieldValues, PayoutEndpoint } from '../corridor/corridor-spec';
import { kesMobileMoney, xofMobileMoney } from '../corridor/mobile-money';
import { ngnBankTransfer } from '../corridor/ngn-bank-transfer';
import { corridorFor } from '../corridor/registry';
import { toPayoutRecipient } from '../corridor/to-payout-recipient';
import { usdAch } from '../corridor/unpayable';
import { usdZelle } from '../corridor/usd-zelle';
import { PaymentMethodCode } from '../entity/beneficiary-form';
import type { PayoutFigures, PayoutInitiation } from '../entity/payout-quote';
import type { PayoutRecipient } from '../entity/payout-recipient';
import type { TransferChallenge } from '../entity/transfer-challenge';
import type { TransferSigningOutcome, TransferSigningPort } from '../port/transfer-signing-port';
import type { BankTransferRepository } from '../repository/bank-transfer-repository';
import type { LastTransferCurrencyRepository } from '../repository/last-transfer-currency-repository';
import {
  createPrepareBankPayoutUseCase,
  type BankPayoutDraft,
} from './prepare-bank-payout-usecase';

const WALLET_ADDRESS = 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1';

const SOLANA_WALLET: Wallet = {
  id: 'sol-wallet',
  address: WALLET_ADDRESS,
  blockchain: 'SOL-DEVNET',
  balances: [{ tokenId: 'usdc-sol', symbol: 'USDC', amount: '5136.98', decimals: 6 }],
};

const CHALLENGE: TransferChallenge = {
  challengeId: 'challenge-1',
  userToken: 'user-token-1',
  encryptionKey: 'encryption-key-1',
};

const NAIRA_FIGURES: PayoutFigures = {
  recipientGetsMinor: 500_000,
  recipientUsdMinor: 333,
  feeUsdMinor: 25,
  totalUsdMinor: 358,
  localPerUsd: 1_500,
};

const SENT: TransferSigningOutcome = {
  type: 'settled',
  status: 'complete',
  resultType: 'transaction',
};

function currency(code: string, countryCode: string): CurrencyDto {
  return {
    name: code,
    code,
    country_code: countryCode,
    continent: 'Africa',
    symbol: code,
    payment_method: 'bank',
    min_amount: 0,
    max_amount: 10_000_000,
    coming_soon: false,
  };
}

function recipientOf(corridor: CorridorSpec, values: FieldValues, countryCode: string) {
  return toPayoutRecipient(
    corridor,
    values,
    currency(corridor.currency, countryCode),
    (name) => name,
  );
}

const NIGERIAN = recipientOf(
  ngnBankTransfer,
  { bankCode: '058', accountNumber: '0123456789', accountName: 'Hannah Nuggest' },
  'NG',
);

function draftFor(recipient: PayoutRecipient, overrides: Partial<BankPayoutDraft> = {}) {
  return {
    recipient,
    fundingToken: 'USDC',
    amountMinor: 500_000,
    narration: 'For upkeep',
    origin: 'transfer' as const,
    ...overrides,
  };
}

function rememberingRepository() {
  const remembered: string[] = [];
  const repository: LastTransferCurrencyRepository = {
    read: () => remembered.at(-1),
    remember: (currency) => {
      remembered.push(currency);
    },
  };

  return { repository, remembered };
}

function walletsAnswering(answer: Result<Wallet[], AppError> = ok([SOLANA_WALLET])) {
  return { listWallets: () => Promise.resolve(answer) } satisfies WalletBalancePort;
}

function recordingRepository(
  answer: Result<PayoutInitiation, AppError> = ok({ figures: NAIRA_FIGURES, challenge: CHALLENGE }),
) {
  const requests: { endpoint: PayoutEndpoint; body: Record<string, unknown> }[] = [];
  const repository: BankTransferRepository = {
    initiate: (endpoint, body) => {
      requests.push({ endpoint, body });

      return Promise.resolve(answer);
    },
  };

  return { repository, requests };
}

function signerAnswering(...answers: TransferSigningOutcome[]) {
  const signed: TransferChallenge[] = [];
  const port: TransferSigningPort = {
    sign: (challenge) => {
      signed.push(challenge);

      return Promise.resolve(ok(answers[Math.min(signed.length - 1, answers.length - 1)] ?? SENT));
    },
  };

  return { port, signed };
}

function build({
  wallets = walletsAnswering(),
  initiation = recordingRepository(),
  signer = signerAnswering(SENT),
  memory = rememberingRepository(),
}: {
  wallets?: WalletBalancePort;
  initiation?: ReturnType<typeof recordingRepository>;
  signer?: ReturnType<typeof signerAnswering>;
  memory?: ReturnType<typeof rememberingRepository>;
} = {}) {
  const useCase = createPrepareBankPayoutUseCase({
    walletBalancePort: wallets,
    bankTransferRepository: initiation.repository,
    transferSigningPort: signer.port,
    lastTransferCurrencyRepository: memory.repository,
  });

  return {
    useCase,
    requests: initiation.requests,
    signed: signer.signed,
    remembered: memory.remembered,
  };
}

async function prepared(useCase: ReturnType<typeof build>['useCase'], draft: BankPayoutDraft) {
  const result = await useCase.execute(draft);
  if (!result.ok) throw new Error(`expected a prepared payout, got ${result.error.code}`);

  return result.value;
}

describe('initiating a payout', () => {
  it.each<[string, PayoutRecipient, PayoutEndpoint, Record<string, unknown>]>([
    [
      'a Nigerian bank account',
      NIGERIAN,
      '/transaction/wallet-to-bank',
      {
        wallet_id: 'sol-wallet',
        wallet_address: WALLET_ADDRESS,
        amount: 500_000,
        currency: 'NGN',
        token_id: 'usdc-sol',
        recipient_bank_code: '058',
        recipient_account_number: '0123456789',
        narration: 'For upkeep',
        save_beneficiary: false,
      },
    ],
    [
      'a Kenyan M-Pesa wallet',
      recipientOf(
        kesMobileMoney,
        { provider: 'mpesa', beneficiaryName: 'Maya Chen', phoneNumber: '+254700000000' },
        'KE',
      ),
      '/transaction/wallet-to-bank',
      {
        wallet_id: 'sol-wallet',
        wallet_address: WALLET_ADDRESS,
        amount: 500_000,
        currency: 'KES',
        token_id: 'usdc-sol',
        msisdn: '+254700000000',
        recipient_name: 'Maya Chen',
        narration: 'For upkeep',
        save_beneficiary: false,
      },
    ],
    [
      'a franc-zone mobile-money wallet',
      recipientOf(
        xofMobileMoney,
        { provider: 'wave', beneficiaryName: 'Awa Diallo', phoneNumber: '+2250700000000' },
        'CI',
      ),
      '/transaction/wallet-to-bank',
      {
        wallet_id: 'sol-wallet',
        wallet_address: WALLET_ADDRESS,
        amount: 500_000,
        currency: 'XOF',
        destination_type: 'mobile_money',
        provider: 'wave',
        country: 'CI',
        msisdn: '+2250700000000',
        recipient_name: 'Awa Diallo',
        save_beneficiary: false,
      },
    ],
    [
      'a Zelle ID',
      recipientOf(
        usdZelle,
        {
          category: 'individual',
          beneficiaryName: 'Precious Jameson',
          zelleId: 'precious.james@mail.com',
        },
        'US',
      ),
      '/transaction/wallet-to-bank',
      {
        wallet_id: 'sol-wallet',
        wallet_address: WALLET_ADDRESS,
        amount: 500_000,
        currency: 'USD',
        token_id: 'usdc-sol',
        zelle_recipient_type: 'individual',
        zelle_recipient_name: 'Precious Jameson',
        zelle_recipient_email: 'precious.james@mail.com',
        narration: 'For upkeep',
        save_beneficiary: false,
      },
    ],
    [
      'a scanned Vietnamese merchant',
      recipientOf(
        corridorFor('VND', PaymentMethodCode.Crypto) ?? ngnBankTransfer,
        { qrString: '00020101021238570010A000000727', merchantName: 'EXAMPLE MERCHANT' },
        'VN',
      ),
      '/transaction/qr-pay',
      {
        qr_string: '00020101021238570010A000000727',
        wallet_id: 'sol-wallet',
        wallet_address: WALLET_ADDRESS,
        token_id: 'usdc-sol',
        amount: 5_000,
      },
    ],
  ])(
    'initiates %s at its endpoint with the body built from it',
    async (_case, recipient, endpoint, body) => {
      const { useCase, requests } = build();

      await useCase.execute(draftFor(recipient));

      expect(requests).toEqual([{ endpoint, body }]);
    },
  );

  it("quotes the backend's figures and its locked rate", async () => {
    const { useCase } = build();

    const payout = await prepared(useCase, draftFor(NIGERIAN));

    expect(payout.quote).toEqual({
      destination: {
        recipientGetsMinor: 500_000,
        feeMinor: 37_500,
        totalMinor: 537_500,
        currency: 'NGN',
      },
      wallet: { recipientGetsMinor: 333, feeMinor: 25, totalMinor: 358, currency: 'USD' },
      rate: 1_500,
    });
  });

  it('passes a refusal from the backend through, untouched', async () => {
    const refusal = serverError(400);
    const { useCase } = build({ initiation: recordingRepository(err(refusal)) });

    expect(await useCase.execute(draftFor(NIGERIAN))).toEqual(err(refusal));
  });

  it('refuses figures the backend did not price, before anything is signed', async () => {
    const { useCase, signed } = build({
      initiation: recordingRepository(
        ok({ figures: { ...NAIRA_FIGURES, localPerUsd: 0 }, challenge: CHALLENGE }),
      ),
    });

    expect((await useCase.execute(draftFor(NIGERIAN))).ok).toBe(false);
    expect(signed).toEqual([]);
  });

  describe('refuses without a request', () => {
    it.each<[string, Partial<BankPayoutDraft>]>([
      ['when no wallet holds the funding token', { fundingToken: 'USDT' }],
      [
        'for a corridor the backend cannot execute',
        { recipient: recipientOf(usdAch, { accountNumber: '123' }, 'US') },
      ],
      ['for nothing to pay', { amountMinor: 0 }],
      ['for a fraction of a minor unit', { amountMinor: 1.5 }],
      ['for a negative amount', { amountMinor: -100 }],
    ])('%s', async (_case, overrides) => {
      const { useCase, requests } = build();

      expect((await useCase.execute(draftFor(NIGERIAN, overrides))).ok).toBe(false);
      expect(requests).toEqual([]);
    });

    it('when the wallets cannot be read', async () => {
      const { useCase, requests } = build({ wallets: walletsAnswering(err(serverError())) });

      expect((await useCase.execute(draftFor(NIGERIAN))).ok).toBe(false);
      expect(requests).toEqual([]);
    });
  });
});

describe('confirming a prepared payout', () => {
  it('signs exactly the challenge the backend returned', async () => {
    const { useCase, signed } = build();
    const payout = await prepared(useCase, draftFor(NIGERIAN));

    expect(await payout.confirm()).toEqual({ type: 'sent' });
    expect(signed).toEqual([CHALLENGE]);
  });

  it('signs the same challenge again after the payer closed the PIN sheet', async () => {
    const { useCase, signed } = build({ signer: signerAnswering({ type: 'cancelled' }, SENT) });
    const payout = await prepared(useCase, draftFor(NIGERIAN));

    expect(await payout.confirm()).toEqual({ type: 'cancelled' });
    expect(await payout.confirm()).toEqual({ type: 'sent' });
    expect(signed).toEqual([CHALLENGE, CHALLENGE]);
  });

  it('does not sign twice once a payment has an outcome', async () => {
    const { useCase, signed } = build();
    const payout = await prepared(useCase, draftFor(NIGERIAN));

    await payout.confirm();

    expect(await payout.confirm()).toEqual({
      type: 'notSent',
      reason: 'invalidRequest',
    });
    expect(signed).toHaveLength(1);
  });

  it('does not sign the same challenge twice at once', async () => {
    const { useCase, signed } = build();
    const payout = await prepared(useCase, draftFor(NIGERIAN));

    const [first, second] = await Promise.all([payout.confirm(), payout.confirm()]);

    expect([first, second]).toEqual([
      { type: 'sent' },
      { type: 'notSent', reason: 'invalidRequest' },
    ]);
    expect(signed).toHaveLength(1);
  });
});

describe('remembering the currency of the last transfer', () => {
  it.each<TransferSigningOutcome>([
    SENT,
    { type: 'settled', status: 'pending', resultType: 'transaction' },
    { type: 'failed', reason: 'network' },
  ])('remembers it once a transfer may have moved money: %o', async (answer) => {
    const { useCase, remembered } = build({ signer: signerAnswering(answer) });

    await (await prepared(useCase, draftFor(NIGERIAN))).confirm();

    expect(remembered).toEqual(['NGN']);
  });

  it.each<TransferSigningOutcome>([
    { type: 'cancelled' },
    { type: 'settled', status: 'failed', resultType: 'transaction' },
    { type: 'settled', status: 'expired', resultType: 'transaction' },
  ])('remembers nothing for a transfer that sent nothing: %o', async (answer) => {
    const { useCase, remembered } = build({ signer: signerAnswering(answer) });

    await (await prepared(useCase, draftFor(NIGERIAN))).confirm();

    expect(remembered).toEqual([]);
  });

  it('remembers nothing for a payment started by scanning', async () => {
    const { useCase, remembered } = build();

    await (await prepared(useCase, draftFor(NIGERIAN, { origin: 'scan' }))).confirm();

    expect(remembered).toEqual([]);
  });
});
