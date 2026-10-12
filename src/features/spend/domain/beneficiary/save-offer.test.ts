import { buildMerchantCode } from '@/test/qr-payloads';
import type { PayoutRecipient } from '../entity/payout-recipient';
import { resolveMerchantCode } from '../usecase/resolve-merchant-code-usecase';
import { toMerchantBeneficiary } from './merchant-beneficiary';
import { saveOfferFor } from './save-offer';

const NIGERIAN: PayoutRecipient = {
  displayName: 'Precious Jameson',
  subtitle: 'Guaranty Trust Bank • 0123578038',
  currency: 'NGN',
  method: 'bank_transfer',
  rail: 'bank_transfer',
  endpoint: '/transaction/wallet-to-bank',
  requiresNarration: true,
  limits: [],
  countryCode: 'NG',
  values: { bankCode: '058', accountNumber: '0123578038', accountName: 'Precious Jameson' },
  labels: { bankCode: 'Guaranty Trust Bank' },
};

function merchantPaying(qrString: string): PayoutRecipient {
  const resolved = resolveMerchantCode(qrString);
  if (resolved.kind !== 'merchant') throw new Error(`not payable: ${resolved.reason}`);

  return resolved.recipient;
}

const STICKER = buildMerchantCode({ merchantName: 'PHO 24' });

const SWITCH = { kind: 'switch' };

describe('saveOfferFor', () => {
  it('offers a bank payee the switch as it always has', () => {
    expect(saveOfferFor(NIGERIAN, [])).toEqual(SWITCH);
    expect(saveOfferFor(NIGERIAN, undefined)).toEqual(SWITCH);
  });

  it('offers the switch for a merchant whose code can be paid again', () => {
    expect(saveOfferFor(merchantPaying(STICKER), [])).toEqual(SWITCH);
  });

  it('offers nothing for a one-time code', () => {
    const oneTime = buildMerchantCode({ amount: '100000', initiation: '12' });

    expect(saveOfferFor(merchantPaying(oneTime), [])).toEqual({ kind: 'none' });
  });

  it('offers a reusable code that names its own amount', () => {
    const priced = buildMerchantCode({ amount: '45000', initiation: '11' });

    expect(saveOfferFor(merchantPaying(priced), [])).toEqual(SWITCH);
  });

  it('offers nothing for a merchant already saved', () => {
    const saved = toMerchantBeneficiary({
      id: 'm1',
      qrString: STICKER,
      createdAt: '',
      updatedAt: '',
    });

    expect(saveOfferFor(merchantPaying(STICKER), [saved])).toEqual({ kind: 'none' });
  });

  it('still offers it while the saved list is not known', () => {
    expect(saveOfferFor(merchantPaying(STICKER), undefined)).toEqual(SWITCH);
  });

  it('offers nothing for a corridor it does not know', () => {
    expect(saveOfferFor({ ...NIGERIAN, currency: 'ZZZ' }, [])).toEqual({ kind: 'none' });
  });
});
