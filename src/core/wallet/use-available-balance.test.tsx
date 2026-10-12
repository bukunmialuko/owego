import { screen } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { Text } from 'react-native';
import { serverError } from '@/core/errors/app-error';
import type { FxQuote, FxRateRepository } from '@/core/fx/fx-rate';
import { formatMinor } from '@/core/money/money';
import { err, ok } from '@/core/result/result';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { useAvailableBalance } from './use-available-balance';
import type { Wallet, WalletBalancePort } from './wallet';

const WALLETS: Wallet[] = [
  {
    id: 'wallet-sol',
    address: 'address',
    blockchain: 'SOL-DEVNET',
    balances: [
      { tokenId: 'usdc-sol', symbol: 'USDC', amount: '30.828566', decimals: 6 },
      { tokenId: 'usdt-sol', symbol: 'USDT', amount: '0', decimals: 6 },
    ],
  },
];

function Balance() {
  const available = useAvailableBalance();

  if (available.isPending) return <Text>pending</Text>;
  if (available.balance === undefined) return <Text>unavailable</Text>;

  return (
    <Text>{formatMinor(available.balance.amountMinor, available.balance.currency, 'en')}</Text>
  );
}

const NAIRA: FxQuote = { baseCurrency: 'USD', quoteCurrency: 'NGN', rate: 1550.5 };

async function renderBalance({
  currency,
  wallets = () => Promise.resolve(ok(WALLETS)),
}: {
  currency?: string;
  wallets?: WalletBalancePort['listWallets'];
} = {}) {
  const getQuote = jest.fn<ReturnType<FxRateRepository['getQuote']>, []>(() =>
    Promise.resolve(ok<FxQuote | undefined>(NAIRA)),
  );
  const container = createTestContainer({
    walletBalancePort: asValue({ listWallets: wallets }),
    fxRateRepository: asValue({ getQuote } satisfies FxRateRepository),
  });
  if (currency !== undefined) container.resolve('displayCurrencyStore').getState().select(currency);

  await renderWithProviders(<Balance />, { container });

  return { getQuote };
}

describe('useAvailableBalance', () => {
  it('totals the wallets in dollars, rounded down', async () => {
    await renderBalance();

    expect(await screen.findByText('$30.82')).toBeOnTheScreen();
  });

  it('stays in dollars whatever currency the user picked', async () => {
    await renderBalance({ currency: 'NGN' });

    expect(await screen.findByText('$30.82')).toBeOnTheScreen();
    expect(screen.queryByText(/₦/)).toBeNull();
  });

  it('never asks for an exchange rate', async () => {
    const { getQuote } = await renderBalance({ currency: 'NGN' });
    await screen.findByText('$30.82');

    expect(getQuote).not.toHaveBeenCalled();
  });

  it('is pending until the wallets answer', async () => {
    await renderBalance({ wallets: () => new Promise(() => undefined) });

    expect(await screen.findByText('pending')).toBeOnTheScreen();
  });

  it('has no balance when the wallets cannot be read', async () => {
    const container = createTestContainer({
      walletBalancePort: asValue({ listWallets: () => Promise.resolve(err(serverError())) }),
    });

    await renderWithProviders(<Balance />, { container });

    expect(await screen.findByText('unavailable')).toBeOnTheScreen();
  });
});
