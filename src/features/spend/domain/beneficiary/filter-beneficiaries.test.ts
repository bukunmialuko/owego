import { BLANK_RECIPIENT_FIELDS, type RecipientFields } from '../entity/beneficiary';
import { buildMerchantCode } from '@/test/qr-payloads';
import { filterBeneficiaries, tabOf } from './filter-beneficiaries';
import { toMerchantBeneficiary } from './merchant-beneficiary';
import { toBeneficiary } from './to-beneficiary';

function saved(id: string, fields: Partial<RecipientFields>, updatedAt = '2026-01-01T00:00:00Z') {
  return toBeneficiary({
    id,
    fields: { ...BLANK_RECIPIENT_FIELDS, ...fields },
    createdAt: updatedAt,
    updatedAt,
  });
}

const HANNAH = saved('hannah', {
  bankCountry: 'ng',
  bankName: 'Guaranty Trust Bank',
  bankCode: '058',
  accountHolder: 'Hannah Nuggest',
  accountNumber: '0123456789',
});
const MYSTERY = saved('mystery', { accountHolder: 'Someone', accountNumber: '123' });
const WALLET = saved('main', {
  bankName: 'SOL',
  accountHolder: 'Main wallet',
  accountNumber: 'Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx3',
});

const LUNCH = toMerchantBeneficiary({
  id: 'lunch',
  qrString: buildMerchantCode(),
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

const ids = (list: readonly { id: string }[]) => list.map((beneficiary) => beneficiary.id);

describe('filterBeneficiaries', () => {
  it('lists bank payees on the bank tab, the unplaceable ones included', () => {
    expect(ids(filterBeneficiaries([HANNAH, MYSTERY, WALLET], 'bank', ''))).toEqual(
      expect.arrayContaining(['hannah', 'mystery']),
    );
    expect(ids(filterBeneficiaries([HANNAH, MYSTERY, WALLET], 'bank', ''))).not.toContain('main');
  });

  it('lists a saved merchant with the bank accounts, never with the wallets', () => {
    expect(tabOf(LUNCH)).toBe('bank');
    expect(ids(filterBeneficiaries([HANNAH, WALLET, LUNCH], 'bank', ''))).toContain('lunch');
    expect(ids(filterBeneficiaries([HANNAH, WALLET, LUNCH], 'wallet', ''))).not.toContain('lunch');
  });

  it('lists only wallets on the wallet tab', () => {
    expect(ids(filterBeneficiaries([HANNAH, MYSTERY, WALLET], 'wallet', ''))).toEqual(['main']);
  });

  it('narrows the tab by what was searched', () => {
    expect(ids(filterBeneficiaries([HANNAH, MYSTERY], 'bank', 'guaranty'))).toEqual(['hannah']);
  });

  it('keeps every record of the same destination', () => {
    const twin = saved('twin', HANNAH.fields, '2026-02-01T00:00:00Z');

    expect(ids(filterBeneficiaries([HANNAH, twin], 'bank', '')).sort()).toEqual(['hannah', 'twin']);
  });
});

describe('tabOf', () => {
  it('puts a wallet on the wallet tab', () => {
    expect(tabOf(WALLET)).toBe('wallet');
  });

  it('puts a bank account on the bank tab', () => {
    expect(tabOf(HANNAH)).toBe('bank');
  });

  it('puts a record nothing can place on the bank tab', () => {
    expect(tabOf(MYSTERY)).toBe('bank');
  });

  it('names the tab the list shows each beneficiary on', () => {
    for (const beneficiary of [HANNAH, MYSTERY, WALLET]) {
      expect(ids(filterBeneficiaries([beneficiary], tabOf(beneficiary), ''))).toEqual([
        beneficiary.id,
      ]);
    }
  });
});
