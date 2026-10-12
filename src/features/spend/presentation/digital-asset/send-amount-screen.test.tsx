import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { Text } from 'react-native';
import { offline } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import type { Wallet, WalletBalancePort } from '@/core/wallet/wallet';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { SendAmountScreen } from './send-amount-screen';
import type { DigitalAssetParamList } from './digital-asset-param-list';

const Stack = createNativeStackNavigator<DigitalAssetParamList>();

const SOLANA_ADDRESS = 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1';

function solanaWallet(balances: Wallet['balances']): Wallet {
  return { id: 'sol-wallet', address: 'own', blockchain: 'SOL-DEVNET', balances };
}

function ConfirmProbe({ route }: NativeStackScreenProps<DigitalAssetParamList, 'Confirm'>) {
  return (
    <Text>{`confirm ${String(route.params.amountMinor)} ${route.params.recipient.tokenSymbol}`}</Text>
  );
}

async function renderAmount({
  tokenSymbol = 'USDC',
  wallets,
}: { tokenSymbol?: string; wallets?: WalletBalancePort } = {}) {
  await renderWithProviders(
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="Amount"
        component={SendAmountScreen}
        initialParams={{
          recipient: {
            address: SOLANA_ADDRESS,
            tokenSymbol,
            networkCode: 'SOL',
            networkName: 'Solana',
          },
        }}
      />
      <Stack.Screen name="Confirm" component={ConfirmProbe} />
    </Stack.Navigator>,
    {
      withNavigation: true,
      container: createTestContainer(
        wallets === undefined ? {} : { walletBalancePort: asValue(wallets) },
      ),
    },
  );
}

function walletsHolding(...wallets: Wallet[]): WalletBalancePort {
  return { listWallets: () => Promise.resolve(ok(wallets)) };
}

describe('the amount step', () => {
  it('floors a fractional balance on Max, and hands the amount on in whole cents', async () => {
    const user = userEvent.setup();
    await renderAmount({
      wallets: walletsHolding(
        solanaWallet([{ tokenId: 'usdc-sol', symbol: 'USDC', amount: '5.136', decimals: 6 }]),
      ),
    });

    await user.press(await screen.findByRole('button', { name: 'Max' }));

    expect(await screen.findByLabelText('Amount to send, $5.13')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('confirm 513 USDC')).toBeOnTheScreen();
  });

  it('hands a typed amount on in whole cents, never as a float', async () => {
    const user = userEvent.setup();
    await renderAmount();

    await user.press(await screen.findByRole('button', { name: '0' }));
    await user.press(screen.getByRole('button', { name: 'Decimal point' }));
    await user.press(screen.getByRole('button', { name: '1' }));
    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('confirm 10 USDC')).toBeOnTheScreen();
  });

  it('shows the Solana wallet’s own balance, not a sum across wallets', async () => {
    await renderAmount({
      wallets: walletsHolding(
        {
          id: 'base-wallet',
          address: 'base',
          blockchain: 'BASE-SEPOLIA',
          balances: [{ tokenId: 'usdc-base', symbol: 'USDC', amount: '900', decimals: 6 }],
        },
        solanaWallet([{ tokenId: 'usdc-sol', symbol: 'USDC', amount: '10', decimals: 6 }]),
      ),
    });

    expect(await screen.findByLabelText('Wallet balance, $10.00')).toBeOnTheScreen();
  });

  it('shows the USDT wallet’s balance when sending USDT', async () => {
    await renderAmount({ tokenSymbol: 'USDT' });

    expect(await screen.findByLabelText('Wallet balance, $0.00')).toBeOnTheScreen();
  });

  it('says the balance could not be loaded, not that it is insufficient', async () => {
    const user = userEvent.setup();
    await renderAmount({ wallets: { listWallets: () => Promise.resolve(err(offline())) } });

    expect(await screen.findByRole('alert', { name: 'Balance unavailable' })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: '5' }));

    expect(screen.queryByLabelText(/^Wallet balance/)).not.toBeOnTheScreen();
    expect(screen.queryByRole('alert', { name: 'Insufficient balance' })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('says nothing about the balance while it is still loading', async () => {
    const user = userEvent.setup();
    await renderAmount({ wallets: { listWallets: () => new Promise(() => undefined) } });

    await user.press(await screen.findByRole('button', { name: '5' }));

    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('calls a wallet without the token insufficient', async () => {
    const user = userEvent.setup();
    await renderAmount({
      tokenSymbol: 'USDT',
      wallets: walletsHolding(
        solanaWallet([{ tokenId: 'usdc-sol', symbol: 'USDC', amount: '10', decimals: 6 }]),
      ),
    });

    await user.press(await screen.findByRole('button', { name: '5' }));

    expect(await screen.findByRole('alert', { name: 'Insufficient balance' })).toBeOnTheScreen();
  });
});
