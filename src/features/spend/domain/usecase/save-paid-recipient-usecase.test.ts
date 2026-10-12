import { offline, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import { toBeneficiary } from '../beneficiary/to-beneficiary';
import { cryptoWallet } from '../corridor/crypto';
import { ngnBankTransfer } from '../corridor/ngn-bank-transfer';
import { recipientFor } from '../corridor/recipient-corridor';
import type { Beneficiary, RecipientFields } from '../entity/beneficiary';
import { PaymentMethodCode } from '../entity/beneficiary-form';
import type { SendOutcome } from '../entity/send-outcome';
import type { BeneficiaryRepository } from '../repository/beneficiary-repository';
import type {
  MerchantBeneficiaryRepository,
  MerchantToSave,
} from '../repository/merchant-beneficiary-repository';
import { buildMerchantCode } from '@/test/qr-payloads';
import { createSaveBeneficiaryUseCase } from './save-beneficiary-usecase';
import { createSaveMerchantUseCase } from './save-merchant-usecase';
import { createSavePaidRecipientUseCase, type PaidRecipient } from './save-paid-recipient-usecase';

const labelOf = (name: string) => (name === 'bankCode' ? 'Guaranty Trust Bank' : '');

const NIGERIAN_VALUES = {
  bankCode: '058',
  accountNumber: '0123456789',
  accountName: 'Hannah Nuggest',
};

const NIGERIAN_ACCOUNT: PaidRecipient = {
  currency: 'NGN',
  method: PaymentMethodCode.BankTransfer,
  values: NIGERIAN_VALUES,
  labels: { bankCode: 'Guaranty Trust Bank' },
};

const WALLET_VALUES = {
  walletTag: 'Tunde’s wallet',
  network: 'SOL',
  walletAddress: 'Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx3',
};

const WALLET: PaidRecipient = {
  currency: 'USDC',
  method: PaymentMethodCode.Crypto,
  values: WALLET_VALUES,
  labels: {},
};

const STICKER = buildMerchantCode({ merchantName: 'EXAMPLE MERCHANT' });

function merchantPaying(qrString = STICKER): PaidRecipient {
  return {
    currency: 'VND',
    method: PaymentMethodCode.Crypto,
    values: { qrString, merchantName: 'EXAMPLE MERCHANT' },
    labels: {},
  };
}

const SENT: SendOutcome = { type: 'sent' };

function repository({
  saved = ok([]),
  created = ok(undefined),
}: {
  saved?: Result<Beneficiary[], AppError>;
  created?: Result<void, AppError>;
} = {}) {
  const reads: string[] = [];
  const writes: RecipientFields[] = [];
  const merchantSaves: MerchantToSave[] = [];
  const merchantBeneficiaryRepository: MerchantBeneficiaryRepository = {
    save: (merchant) => {
      merchantSaves.push(merchant);
      return Promise.resolve(ok(undefined));
    },
  };
  const beneficiaryRepository: BeneficiaryRepository = {
    list: () => {
      reads.push('list');
      return Promise.resolve(saved);
    },
    getRecent: () => Promise.resolve(ok([])),
    get: () => Promise.resolve(err(offline())),
    create: (fields) => {
      writes.push(fields);
      return Promise.resolve(created);
    },
    remove: () => Promise.resolve(ok(undefined)),
  };

  const useCase = createSavePaidRecipientUseCase({
    beneficiaryRepository,
    saveMerchantUseCase: createSaveMerchantUseCase({ merchantBeneficiaryRepository }),
    saveBeneficiaryUseCase: createSaveBeneficiaryUseCase({ beneficiaryRepository }),
  });

  return { reads, writes, merchantSaves, useCase };
}

describe('keeping a paid recipient as a beneficiary', () => {
  it("saves a paid Nigerian account under its bank's name and the holder the server resolved", async () => {
    const { writes, useCase } = repository();

    const result = await useCase.execute({
      recipient: NIGERIAN_ACCOUNT,
      outcome: SENT,
      saveAsBeneficiary: true,
    });

    expect(result).toEqual(ok({ kind: 'saved' }));
    expect(writes).toEqual([recipientFor(ngnBankTransfer, NIGERIAN_VALUES, labelOf)]);
    expect(writes[0]).toMatchObject({
      bankCountry: 'ng',
      bankName: 'Guaranty Trust Bank',
      bankCode: '058',
      accountHolder: 'Hannah Nuggest',
      accountNumber: '0123456789',
    });
  });

  it('saves a paid wallet under its tag, its network and its address', async () => {
    const { writes, useCase } = repository();

    const result = await useCase.execute({
      recipient: WALLET,
      outcome: SENT,
      saveAsBeneficiary: true,
    });

    expect(result).toEqual(ok({ kind: 'saved' }));
    expect(writes).toEqual([recipientFor(cryptoWallet, WALLET_VALUES, labelOf)]);
    expect(writes[0]).toMatchObject({
      bankName: 'SOL',
      accountHolder: 'Tunde’s wallet',
      accountNumber: 'Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx3',
    });
  });

  it.each<SendOutcome>([{ type: 'processing' }, { type: 'unconfirmed' }])(
    'saves after a payment that may have moved money: $type',
    async (outcome) => {
      const { writes, useCase } = repository();

      await useCase.execute({ recipient: NIGERIAN_ACCOUNT, outcome, saveAsBeneficiary: true });

      expect(writes).toHaveLength(1);
    },
  );

  it('reads and writes nothing when the payer left saving off', async () => {
    const { reads, writes, useCase } = repository();

    const result = await useCase.execute({
      recipient: NIGERIAN_ACCOUNT,
      outcome: SENT,
      saveAsBeneficiary: false,
    });

    expect(result).toEqual(ok({ kind: 'skipped' }));
    expect(reads).toEqual([]);
    expect(writes).toEqual([]);
  });

  it.each<SendOutcome>([{ type: 'cancelled' }, { type: 'notSent', reason: 'failed' }])(
    'keeps nobody the payer did not end up paying: $type',
    async (outcome) => {
      const { reads, writes, useCase } = repository();

      const result = await useCase.execute({
        recipient: NIGERIAN_ACCOUNT,
        outcome,
        saveAsBeneficiary: true,
      });

      expect(result).toEqual(ok({ kind: 'skipped' }));
      expect(reads).toEqual([]);
      expect(writes).toEqual([]);
    },
  );

  it('hands a merchant to the merchant save as its code', async () => {
    const { reads, writes, merchantSaves, useCase } = repository();

    const result = await useCase.execute({
      recipient: merchantPaying(),
      outcome: SENT,
      saveAsBeneficiary: true,
    });

    expect(result).toEqual(ok({ kind: 'saved' }));
    expect(merchantSaves).toEqual([{ qrString: STICKER }]);
    expect(reads).toEqual([]);
    expect(writes).toEqual([]);
  });

  it('never hands over a one-time code, even when asked', async () => {
    const { merchantSaves, useCase } = repository();
    const oneTime = buildMerchantCode({ amount: '100000', initiation: '12' });

    const result = await useCase.execute({
      recipient: merchantPaying(oneTime),
      outcome: SENT,
      saveAsBeneficiary: true,
    });

    expect(result).toEqual(ok({ kind: 'skipped' }));
    expect(merchantSaves).toEqual([]);
  });

  it('hands over no merchant when the switch is off', async () => {
    const { merchantSaves, useCase } = repository();

    await useCase.execute({
      recipient: merchantPaying(),
      outcome: SENT,
      saveAsBeneficiary: false,
    });

    expect(merchantSaves).toEqual([]);
  });

  it('names the beneficiary already saved rather than saving the account twice', async () => {
    const already = toBeneficiary({
      id: 'saved-1',
      fields: recipientFor(ngnBankTransfer, NIGERIAN_VALUES, labelOf),
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    });
    const { writes, useCase } = repository({ saved: ok([already]) });

    const result = await useCase.execute({
      recipient: NIGERIAN_ACCOUNT,
      outcome: SENT,
      saveAsBeneficiary: true,
    });

    expect(result).toEqual(ok({ kind: 'duplicate', existing: already }));
    expect(writes).toEqual([]);
  });

  it('writes nothing when the saved list cannot be read to check for a copy', async () => {
    const { writes, useCase } = repository({ saved: err(offline()) });

    const result = await useCase.execute({
      recipient: NIGERIAN_ACCOUNT,
      outcome: SENT,
      saveAsBeneficiary: true,
    });

    expect(result).toEqual(err(offline()));
    expect(writes).toEqual([]);
  });

  it('passes a refused save through', async () => {
    const { useCase } = repository({ created: err(offline()) });

    const result = await useCase.execute({
      recipient: NIGERIAN_ACCOUNT,
      outcome: SENT,
      saveAsBeneficiary: true,
    });

    expect(result).toEqual(err(offline()));
  });
});
