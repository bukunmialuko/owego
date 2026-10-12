import { screen } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { Text } from 'react-native';
import { serverError } from '@/core/errors/app-error';
import type { FxQuote, FxRateRepository } from '@/core/fx/fx-rate';
import { formatMinor } from '@/core/money/money';
import { err, ok } from '@/core/result/result';
import type { Wallet } from '@/core/wallet/wallet';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { useConvertedBalance } from './use-converted-balance';

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

const NAIRA: FxQuote = { baseCurrency: 'USD', quoteCurrency: 'NGN', rate: 1550.5 };

function Converted() {
  const { converted, isPending } = useConvertedBalance();

  if (isPending) return <Text>pending</Text>;
  if (converted === undefined) return <Text>none</Text>;

  return <Text>{formatMinor(converted.amountMinor, converted.currency, 'en')}</Text>;
}

async function renderConverted({
  currency,
  getQuote,
}: {
  currency: string;
  getQuote: FxRateRepository['getQuote'];
}) {
  const container = createTestContainer({
    walletBalancePort: asValue({ listWallets: () => Promise.resolve(ok(WALLETS)) }),
    fxRateRepository: asValue({ getQuote } satisfies FxRateRepository),
  });
  container.resolve('displayCurrencyStore').getState().select(currency);

  await renderWithProviders(<Converted />, { container });
}

describe('useConvertedBalance', () => {
  it('converts the exact holding into the picked currency, rounded down', async () => {
    await renderConverted({ currency: 'NGN', getQuote: () => Promise.resolve(ok(NAIRA)) });

    expect(await screen.findByText('₦47,799.69')).toBeOnTheScreen();
  });

  it('asks for the rate from dollars into the picked currency', async () => {
    const getQuote = jest.fn(() => Promise.resolve(ok<FxQuote | undefined>(NAIRA)));

    await renderConverted({ currency: 'NGN', getQuote });
    await screen.findByText('₦47,799.69');

    expect(getQuote).toHaveBeenCalledWith('USD', 'NGN');
  });

  it('has nothing to convert, and nothing pending, for a dollar user', async () => {
    const getQuote = jest.fn(() => Promise.resolve(ok<FxQuote | undefined>(NAIRA)));

    await renderConverted({ currency: 'USD', getQuote });

    expect(screen.getByText('none')).toBeOnTheScreen();
    expect(getQuote).not.toHaveBeenCalled();
  });

  it('is pending until the rate answers', async () => {
    await renderConverted({ currency: 'NGN', getQuote: () => new Promise(() => undefined) });

    expect(await screen.findByText('pending')).toBeOnTheScreen();
  });

  it('has no figure when the rate cannot be fetched', async () => {
    await renderConverted({
      currency: 'NGN',
      getQuote: () => Promise.resolve(err(serverError())),
    });

    expect(await screen.findByText('none')).toBeOnTheScreen();
  });

  it('has no figure when there is no rate to give', async () => {
    await renderConverted({ currency: 'NGN', getQuote: () => Promise.resolve(ok(undefined)) });

    expect(await screen.findByText('none')).toBeOnTheScreen();
  });
});
