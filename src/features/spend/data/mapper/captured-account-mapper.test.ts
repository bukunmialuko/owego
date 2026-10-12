import { toCapturedAccount } from './captured-account-mapper';

describe('toCapturedAccount', () => {
  it('renames every field the wire spells differently', () => {
    expect(
      toCapturedAccount({
        account_number: '0123578038',
        bank_name: 'Guaranty Trust Bank',
        bank_code: '058',
        account_name: 'Precious Jameson',
        is_verified: true,
      }),
    ).toEqual({
      accountNumber: '0123578038',
      bankName: 'Guaranty Trust Bank',
      bankCode: '058',
      accountName: 'Precious Jameson',
      isVerified: true,
    });
  });

  it('carries an unverified account across as unverified', () => {
    expect(
      toCapturedAccount({
        account_number: '0123578038',
        bank_name: 'Opay',
        bank_code: '100004',
        account_name: '',
        is_verified: false,
      }).isVerified,
    ).toBe(false);
  });
});
