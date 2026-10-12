import { offline } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { AppError } from '@/core/errors/app-error';
import {
  BLANK_RECIPIENT_FIELDS,
  type Beneficiary,
  type RecipientFields,
} from '../../domain/entity/beneficiary';
import { buildMerchantCode } from '@/test/qr-payloads';
import { toMerchantBeneficiary } from '../../domain/beneficiary/merchant-beneficiary';
import { toBeneficiary } from '../../domain/beneficiary/to-beneficiary';
import type { BeneficiaryRepository } from '../../domain/repository/beneficiary-repository';
import { createPayeePortAdapter } from './payee-port-adapter';

function saved(id: string, fields: Partial<RecipientFields>): Beneficiary {
  return toBeneficiary({
    id,
    fields: { ...BLANK_RECIPIENT_FIELDS, ...fields },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  });
}

const BANK = saved('p1', {
  bankCountry: 'ng',
  bankName: 'Guaranty Trust Bank',
  bankCode: '058',
  accountHolder: 'Lena Fischer',
  accountNumber: '0123451028',
});

const WALLET = saved('p2', {
  bankName: 'BASE',
  accountNumber: '0xb249000000000000000000000000000000003901',
});

const STICKER = buildMerchantCode({ merchantName: 'PHO 24' });

function merchant(qrString = STICKER): Beneficiary {
  return toMerchantBeneficiary({
    id: 'm1',
    qrString,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  });
}

function adapterOver(recent: Result<Beneficiary[], AppError>) {
  const repository: BeneficiaryRepository = {
    list: () => Promise.resolve(ok([])),
    getRecent: () => Promise.resolve(recent),
    get: () => Promise.resolve(err(offline())),
    create: () => Promise.resolve(ok(undefined)),
    remove: () => Promise.resolve(ok(undefined)),
  };

  return createPayeePortAdapter(repository);
}

describe('payee port adapter', () => {
  it('composes a bank payee into a name and a masked account line', async () => {
    const result = await adapterOver(ok([BANK])).getRecent(5);

    expect(result.ok && result.value[0]).toEqual({
      id: 'p1',
      name: 'Lena Fischer',
      detail: 'Guaranty Trust Bank • **1028',
      countryCode: 'ng',
      tint: 'brand',
      destination: {
        kind: 'bankTransfer',
        prefill: {
          currency: 'NGN',
          method: 'bank_transfer',
          values: { bankCode: '058', accountNumber: '0123451028' },
        },
      },
    });
  });

  it('leads a wallet to Send, filled in', async () => {
    const result = await adapterOver(ok([WALLET])).getRecent(5);

    expect(result.ok && result.value[0]?.destination).toEqual({
      kind: 'walletSend',
      prefill: { address: '0xb249000000000000000000000000000000003901', networkCode: 'BASE' },
    });
  });

  it('leads a payee no form can pay to their details', async () => {
    const ach = saved('p4', {
      bankCountry: 'us',
      bankName: 'Chase',
      bankCode: '021000021',
      accountHolder: 'Precious Jameson',
      accountNumber: '0123456789',
      paymentMethod: 'ACH',
      accountType: 'checking',
    });

    const result = await adapterOver(ok([ach])).getRecent(5);

    expect(result.ok && result.value[0]?.destination).toEqual({ kind: 'details' });
  });

  it('names a wallet by its tag, with its address beneath', async () => {
    const tagged = saved('p3', { ...WALLET.fields, accountHolder: 'Main wallet' });

    const result = await adapterOver(ok([tagged])).getRecent(5);

    expect(result.ok && result.value[0]).toMatchObject({
      name: 'Main wallet',
      detail: '0xb249…3901',
    });
  });

  it('names an untagged wallet by its address', async () => {
    const result = await adapterOver(ok([WALLET])).getRecent(5);

    expect(result.ok && result.value[0]).toMatchObject({
      name: '0xb249…3901',
      detail: '0xb249…3901',
    });
  });

  it('leads a saved merchant to the merchant amount page with its code', async () => {
    const result = await adapterOver(ok([merchant()])).getRecent(5);

    expect(result.ok && result.value[0]?.destination).toEqual({
      kind: 'merchantPay',
      qrString: STICKER,
    });
  });

  it('names a merchant by the name its code carries, with its currency beneath and its country', async () => {
    const result = await adapterOver(ok([merchant()])).getRecent(5);

    expect(result.ok && result.value[0]).toMatchObject({
      name: 'PHO 24',
      detail: 'VND',
      countryCode: 'vn',
    });
  });

  it('omits the country rather than sending an empty one', async () => {
    const result = await adapterOver(
      ok([saved('p4', { ...BANK.fields, bankCountry: '' })]),
    ).getRecent(5);

    expect(result.ok && result.value[0]).not.toHaveProperty('countryCode');
  });

  it('answers no more than it is asked for', async () => {
    const many = Array.from({ length: 8 }, (_, index) => saved(`p${String(index)}`, BANK.fields));

    const result = await adapterOver(ok(many)).getRecent(5);

    expect(result.ok ? result.value : []).toHaveLength(5);
  });

  it('gives adjacent payees different tints', async () => {
    const many = Array.from({ length: 5 }, (_, index) => saved(`p${String(index)}`, BANK.fields));

    const result = await adapterOver(ok(many)).getRecent(5);
    const tints = result.ok ? result.value.map((payee) => payee.tint) : [];

    expect(new Set(tints).size).toBe(5);
  });

  it('passes a failed read through', async () => {
    expect(await adapterOver(err(offline())).getRecent(5)).toEqual(err(offline()));
  });
});
