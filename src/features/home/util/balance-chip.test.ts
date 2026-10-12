import type { AvailableBalance } from '@/core/wallet/available-balance';
import { balanceChip } from './balance-chip';

const NAIRA = { baseCurrency: 'USD', quoteCurrency: 'NGN', rate: 1550.5 };
const IN_NAIRA: AvailableBalance = { amountMinor: 4779969, currency: 'NGN' };

describe('balanceChip', () => {
  it('shows the balance in the picked currency, under its flag', () => {
    expect(
      balanceChip({
        isHidden: false,
        converted: IN_NAIRA,
        quote: NAIRA,
        isPending: false,
        locale: 'en',
      }),
    ).toEqual({ kind: 'converted', countryCode: 'NG', amount: '₦47,799.69' });
  });

  it('shows only the public rate once the balance is hidden', () => {
    expect(
      balanceChip({
        isHidden: true,
        converted: IN_NAIRA,
        quote: NAIRA,
        isPending: false,
        locale: 'en',
      }),
    ).toEqual({ kind: 'rate', countryCode: 'NG', base: '$1', quote: '₦1,550.50' });
  });

  it('shows the rate while hidden even before the wallets answer', () => {
    expect(
      balanceChip({
        isHidden: true,
        converted: undefined,
        quote: NAIRA,
        isPending: true,
        locale: 'en',
      }),
    ).toEqual({ kind: 'rate', countryCode: 'NG', base: '$1', quote: '₦1,550.50' });
  });

  it.each([false, true])('holds the place while the rate loads (hidden: %p)', (isHidden) => {
    expect(
      balanceChip({
        isHidden,
        converted: undefined,
        quote: undefined,
        isPending: true,
        locale: 'en',
      }),
    ).toEqual({ kind: 'pending' });
  });

  it.each([false, true])('has no chip without a rate (hidden: %p)', (isHidden) => {
    expect(
      balanceChip({
        isHidden,
        converted: undefined,
        quote: undefined,
        isPending: false,
        locale: 'en',
      }),
    ).toBeUndefined();
  });
});
