import { buildMerchantCode, PIX_STATIC_PAYLOAD } from '@/test/qr-payloads';
import { merchantCodeIn } from './merchant-code';

describe('merchantCodeIn', () => {
  it('calls a code generated for one sale one-time', () => {
    const code = merchantCodeIn(buildMerchantCode({ amount: '100000', initiation: '12' }));

    expect(code?.isOneTime).toBe(true);
  });

  it('calls a printed sticker reusable', () => {
    expect(merchantCodeIn(buildMerchantCode({ initiation: '11' }))?.isOneTime).toBe(false);
  });

  it('calls a reusable code that names its own amount reusable', () => {
    const code = merchantCodeIn(buildMerchantCode({ amount: '45000', initiation: '11' }));

    expect(code?.isOneTime).toBe(false);
  });

  it('calls a code that does not say how it was made reusable', () => {
    expect(merchantCodeIn(PIX_STATIC_PAYLOAD)?.isOneTime).toBe(false);
    expect(merchantCodeIn(buildMerchantCode({ initiation: 'absent' }))?.isOneTime).toBe(false);
  });

  it('keeps the code verbatim, with what it says about the merchant', () => {
    const raw = buildMerchantCode({ merchantName: 'PHO 24', merchantCity: 'Hanoi' });

    expect(merchantCodeIn(raw)).toEqual({
      raw,
      merchantName: 'PHO 24',
      merchantCity: 'Hanoi',
      currency: 'VND',
      country: 'VN',
      isOneTime: false,
    });
  });

  it('keeps a missing merchant name empty rather than inventing one', () => {
    expect(merchantCodeIn(buildMerchantCode({ merchantName: '' }))?.merchantName).toBe('');
  });

  it('answers nothing for a bank account number, a phone number or a wallet address', () => {
    expect(merchantCodeIn('0123456789')).toBeUndefined();
    expect(merchantCodeIn('+2250701234567')).toBeUndefined();
    expect(merchantCodeIn('0x52908400098527886E0F7030069857D2E4169EE7')).toBeUndefined();
    expect(merchantCodeIn('')).toBeUndefined();
  });
});
