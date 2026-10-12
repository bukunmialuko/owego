import { screen } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { Text } from 'react-native';
import { serverError } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { useWalletsQuery } from './use-wallets-query';
import type { Wallet, WalletBalancePort } from './wallet';

const WALLETS: Wallet[] = [
  {
    id: 'wallet-sol',
    address: 'address',
    blockchain: 'SOL-DEVNET',
    balances: [{ tokenId: 'usdc-sol', symbol: 'USDC', amount: '5.13', decimals: 6 }],
  },
];

function WalletCount() {
  const wallets = useWalletsQuery();

  if (wallets.isError) return <Text>{`count failed`}</Text>;

  return (
    <Text>{wallets.data === undefined ? `count pending` : `${wallets.data.length} held`}</Text>
  );
}

function HeldSymbols() {
  const symbols = useWalletsQuery((wallets) =>
    wallets.flatMap((wallet) => wallet.balances.map((balance) => balance.symbol)).join(','),
  );

  return <Text>{symbols.data ?? `symbols pending`}</Text>;
}

function renderReaders(ui: React.ReactElement, listWallets: WalletBalancePort['listWallets']) {
  return renderWithProviders(ui, {
    container: createTestContainer({ walletBalancePort: asValue({ listWallets }) }),
  });
}

describe('useWalletsQuery', () => {
  it('serves every reader from one request, each in its own shape', async () => {
    const listWallets = jest.fn(() => Promise.resolve(ok(WALLETS)));

    await renderReaders(
      <>
        <WalletCount />
        <HeldSymbols />
      </>,
      listWallets,
    );

    expect(await screen.findByText('1 held')).toBeOnTheScreen();
    expect(screen.getByText('USDC')).toBeOnTheScreen();
    expect(listWallets).toHaveBeenCalledTimes(1);
  });

  it('answers a reader that arrives after the list has loaded on its first render', async () => {
    const listWallets = jest.fn(() => Promise.resolve(ok(WALLETS)));
    await renderReaders(<WalletCount />, listWallets);
    await screen.findByText('1 held');

    await screen.rerender(
      <>
        <WalletCount />
        <HeldSymbols />
      </>,
    );

    expect(screen.getByText('USDC')).toBeOnTheScreen();
    expect(screen.queryByText('symbols pending')).toBeNull();
  });

  it('reports a failed read as an error rather than as no wallets', async () => {
    await renderReaders(<WalletCount />, () => Promise.resolve(err(serverError())));

    expect(await screen.findByText('count failed')).toBeOnTheScreen();
  });
});
