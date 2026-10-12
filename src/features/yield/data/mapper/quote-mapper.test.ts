import type { DepositQuoteDto, WithdrawalQuoteDto } from '../model/yield-move-model';
import { toDepositQuote, toWithdrawalQuote } from './quote-mapper';

function deposit(sent: Partial<DepositQuoteDto>): DepositQuoteDto {
  return {
    stake_amount_usdc: undefined,
    estimated_gas_usdc: undefined,
    total_debit_usdc: undefined,
    ...sent,
  };
}

function withdrawal(sent: Partial<WithdrawalQuoteDto>): WithdrawalQuoteDto {
  return {
    withdraw_amount_usdc: undefined,
    estimated_gas_usdc: undefined,
    net_received_usdc: undefined,
    ...sent,
  };
}

describe('toDepositQuote', () => {
  it('prices a deposit from its total debit', () => {
    expect(
      toDepositQuote(
        deposit({ stake_amount_usdc: 15, total_debit_usdc: 15.25, estimated_gas_usdc: 0.25 }),
        1_500,
      ),
    ).toEqual({
      kind: 'deposit',
      amountMinor: 1_500,
      feeMinor: 25,
      totalMinor: 1_525,
      currency: 'USD',
    });
  });

  it('rounds the debit up', () => {
    expect(
      toDepositQuote(deposit({ stake_amount_usdc: 15, total_debit_usdc: 15.2501 }), 1_500)
        ?.feeMinor,
    ).toBe(26);
  });

  it('prices from the gas alone when no total is sent', () => {
    expect(
      toDepositQuote(deposit({ stake_amount_usdc: 15, estimated_gas_usdc: 0.2501 }), 1_500),
    ).toMatchObject({ feeMinor: 26, totalMinor: 1_526 });
  });

  it.each([
    ['no echoed amount', { total_debit_usdc: 15.25 }],
    ['a different amount', { stake_amount_usdc: 1_500, total_debit_usdc: 1_500.25 }],
    ['no fee at all', { stake_amount_usdc: 15 }],
    ['a debit below the amount', { stake_amount_usdc: 15, total_debit_usdc: 14 }],
  ])('refuses a quote with %s', (_case, sent) => {
    expect(toDepositQuote(deposit(sent), 1_500)).toBeUndefined();
  });
});

describe('toWithdrawalQuote', () => {
  it('prices a withdrawal from what reaches the wallet', () => {
    expect(
      toWithdrawalQuote(
        withdrawal({
          withdraw_amount_usdc: 15,
          net_received_usdc: 14.7499,
          estimated_gas_usdc: 0.2501,
        }),
        1_500,
      ),
    ).toEqual({
      kind: 'withdrawal',
      amountMinor: 1_500,
      feeMinor: 26,
      totalMinor: 1_474,
      currency: 'USD',
    });
  });

  it('prices from the gas alone when no net is sent', () => {
    expect(
      toWithdrawalQuote(withdrawal({ withdraw_amount_usdc: 15, estimated_gas_usdc: 0.25 }), 1_500),
    ).toMatchObject({ feeMinor: 25, totalMinor: 1_475 });
  });

  it.each([
    ['no echoed amount', { net_received_usdc: 14.75 }],
    ['a different amount', { withdraw_amount_usdc: 16, net_received_usdc: 15.75 }],
    ['no figures at all', { withdraw_amount_usdc: 15 }],
    ['more arriving than leaves', { withdraw_amount_usdc: 15, net_received_usdc: 16 }],
  ])('refuses a quote with %s', (_case, sent) => {
    expect(toWithdrawalQuote(withdrawal(sent), 1_500)).toBeUndefined();
  });
});
