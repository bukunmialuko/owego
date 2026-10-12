import { buildMerchantCode } from '@/test/qr-payloads';
import { merchantDetailRows, toMerchantBeneficiary } from './merchant-beneficiary';

const STAMP = '2026-10-05T00:00:00Z';

describe('toMerchantBeneficiary', () => {
  it('names a saved merchant by what its code says', () => {
    const qrString = buildMerchantCode({ merchantName: 'PHO 24' });

    expect(
      toMerchantBeneficiary({
        id: 'm-1',
        qrString,
        createdAt: STAMP,
        updatedAt: STAMP,
      }),
    ).toMatchObject({
      kind: 'merchant',
      id: 'm-1',
      merchantName: 'PHO 24',
      currency: 'VND',
      countryCode: 'vn',
      qrString,
    });
  });

  it('keeps the code character for character', () => {
    const qrString = buildMerchantCode({ merchantName: 'Café Sài Gòn' });

    const merchant = toMerchantBeneficiary({
      id: 'm-1',
      qrString,
      createdAt: STAMP,
      updatedAt: STAMP,
    });

    expect(merchant.qrString).toBe(qrString);
  });

  it('names nobody when the code names nobody', () => {
    const merchant = toMerchantBeneficiary({
      id: 'm-1',
      qrString: buildMerchantCode({ merchantName: '' }),
      createdAt: STAMP,
      updatedAt: STAMP,
    });

    expect(merchant.merchantName).toBe('');
  });

  it('keeps a code it cannot read, naming nothing from it', () => {
    const merchant = toMerchantBeneficiary({
      id: 'm-1',
      qrString: 'not a code',
      createdAt: STAMP,
      updatedAt: STAMP,
    });

    expect(merchant).toMatchObject({ qrString: 'not a code', merchantName: '', currency: '' });
    expect(merchant).not.toHaveProperty('countryCode');
  });
});

describe('merchantDetailRows', () => {
  it('shows a saved merchant by the name, city and currency its code carries', () => {
    const qrString = buildMerchantCode({ merchantName: 'PHO 24', merchantCity: 'Hanoi' });

    expect(merchantDetailRows(qrString)).toEqual([
      { labelKey: 'spend.merchant.label', value: 'PHO 24' },
      { labelKey: 'spend.city', value: 'Hanoi' },
      { labelKey: 'common.currency', value: 'VND' },
    ]);
  });

  it('says the code names nobody rather than leaving the merchant blank', () => {
    const qrString = buildMerchantCode({ merchantName: '', merchantCity: '' });

    expect(merchantDetailRows(qrString)).toEqual([
      { labelKey: 'spend.merchant.label', valueKey: 'spend.merchant.unnamed' },
      { labelKey: 'common.currency', value: 'VND' },
    ]);
  });

  it('shows nothing it cannot read from an unreadable code', () => {
    expect(merchantDetailRows('not a code')).toEqual([
      { labelKey: 'spend.merchant.label', valueKey: 'spend.merchant.unnamed' },
    ]);
  });
});
