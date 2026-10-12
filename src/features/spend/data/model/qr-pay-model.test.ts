import { qrPayResponseSchema } from './qr-pay-model';

const BLANK = {
  currency: '',
  amount_local: 0,
  amount_usdc: 0,
  base_amount_usdc: 0,
  fee: { total_fee: 0 },
  rate: 0,
  challenge_id: '',
  user_token: '',
  encryption_key: '',
};

describe('qr-pay model', () => {
  it('parses an empty response', () => {
    expect(qrPayResponseSchema.parse({})).toEqual({ data: BLANK });
  });

  it("reads v1's merchant payment model", () => {
    const parsed = qrPayResponseSchema.parse({
      data: {
        transaction_id: 'txn_1',
        status: 'pending',
        merchant: 'Shop',
        currency: 'KES',
        amount_local: 25.0,
        fee: { total_fee: 1.5, fee_percent: 6.0 },
      },
    });

    expect(parsed.data).toEqual({
      ...BLANK,
      currency: 'KES',
      amount_local: 25,
      fee: { total_fee: 1.5 },
    });
  });

  it('refuses a fee that is not a number', () => {
    expect(qrPayResponseSchema.safeParse({ data: { fee: { total_fee: '1.5' } } }).success).toBe(
      false,
    );
  });
});
