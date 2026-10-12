import { walletToBankResponseSchema } from './wallet-to-bank-model';

const BLANK = {
  amount_fiat: 0,
  amount_usdc: 0,
  base_amount_usdc: 0,
  rate: 0,
  challenge_id: '',
  user_token: '',
  encryption_key: '',
};

describe('wallet-to-bank model', () => {
  it('parses an empty response', () => {
    expect(walletToBankResponseSchema.parse({})).toEqual({ data: BLANK });
  });

  it("reads v1's payment model", () => {
    const parsed = walletToBankResponseSchema.parse({
      data: {
        transaction_id: 'txn_1',
        status: 'pending',
        amount_fiat: 1250.0,
        rate: 1500.0,
        challenge_id: 'chal_1',
      },
    });

    expect(parsed.data).toEqual({
      ...BLANK,
      amount_fiat: 1250,
      rate: 1500,
      challenge_id: 'chal_1',
    });
  });

  it('refuses an amount that is not a number', () => {
    expect(walletToBankResponseSchema.safeParse({ data: { amount_usdc: '1.00' } }).success).toBe(
      false,
    );
  });
});
