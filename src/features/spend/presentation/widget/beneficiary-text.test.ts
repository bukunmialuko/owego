import { BLANK_RECIPIENT_FIELDS, type RecipientFields } from '../../domain/entity/beneficiary';
import { toBeneficiary } from '../../domain/beneficiary/to-beneficiary';
import { buildMerchantCode } from '@/test/qr-payloads';
import { toMerchantBeneficiary } from '../../domain/beneficiary/merchant-beneficiary';
import { beneficiarySubtitle, beneficiaryTitle } from './beneficiary-text';

const t = (key: string) => key;

function merchant(merchantName = 'PHO 24') {
  return toMerchantBeneficiary({
    id: 'm1',
    qrString: buildMerchantCode({ merchantName }),
    createdAt: '',
    updatedAt: '',
  });
}

const ADDRESS = '0xb249111111111111111111111111111111113901';

function saved(fields: Partial<RecipientFields>) {
  return toBeneficiary({
    id: 'r1',
    fields: { ...BLANK_RECIPIENT_FIELDS, ...fields },
    createdAt: '',
    updatedAt: '',
  });
}

describe('beneficiaryTitle', () => {
  it('names a wallet by its tag', () => {
    expect(
      beneficiaryTitle(
        saved({ bankName: 'BASE', accountHolder: 'Main wallet', accountNumber: ADDRESS }),
        t,
      ),
    ).toBe('Main wallet');
  });

  it('names an untagged wallet by its shortened address', () => {
    expect(beneficiaryTitle(saved({ bankName: 'BASE', accountNumber: ADDRESS }), t)).toBe(
      '0xb249…3901',
    );
  });

  it('names a payee by the holder', () => {
    expect(beneficiaryTitle(saved({ bankCountry: 'ng', accountHolder: 'Hannah Nuggest' }), t)).toBe(
      'Hannah Nuggest',
    );
  });

  it('falls back to the institution, then the masked account, for a payee with no name', () => {
    expect(
      beneficiaryTitle(
        saved({ bankCountry: 'ng', bankName: 'GTBank', accountNumber: '0123456789' }),
        t,
      ),
    ).toBe('GTBank');
    expect(beneficiaryTitle(saved({ bankCountry: 'ng', accountNumber: '0123456789' }), t)).toBe(
      '**6789',
    );
  });
});

describe('a saved merchant', () => {
  it('is titled by the name its code carries, with its currency beneath', () => {
    expect(beneficiaryTitle(merchant(), t)).toBe('PHO 24');
    expect(beneficiarySubtitle(merchant())).toBe('VND');
  });

  it('is called "(No merchant name)" when its code names nobody', () => {
    expect(beneficiaryTitle(merchant(''), t)).toBe('spend.merchant.unnamed');
    expect(beneficiarySubtitle(merchant(''))).toBe('VND');
  });

  it('never shows any part of its code', () => {
    const shown = [beneficiaryTitle(merchant(), t), beneficiarySubtitle(merchant())];

    expect(shown.join(' ')).not.toContain('000201');
  });
});

describe('beneficiarySubtitle', () => {
  it('reads "Bank Name • **1028" for a payee', () => {
    expect(
      beneficiarySubtitle(
        saved({ bankCountry: 'ng', bankName: 'GTBank', accountNumber: '0123451028' }),
      ),
    ).toBe('GTBank • **1028');
  });

  it('leaves out an institution the record does not name', () => {
    expect(beneficiarySubtitle(saved({ bankCountry: 'ng', accountNumber: '0123451028' }))).toBe(
      '**1028',
    );
  });

  it('shortens a wallet address', () => {
    expect(
      beneficiarySubtitle(
        saved({ bankName: 'SOL', accountNumber: 'Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx3' }),
      ),
    ).toBe('Bxxxxx…xxx3');
  });
});
