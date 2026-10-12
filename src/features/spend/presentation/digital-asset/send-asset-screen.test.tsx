import Clipboard from '@react-native-clipboard/clipboard';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { QueryClient } from '@tanstack/react-query';
import { screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { Text } from 'react-native';
import { ok } from '@/core/result/result';
import { walletsQueryKey } from '@/core/wallet/use-wallets-query';
import type { Wallet, WalletBalancePort } from '@/core/wallet/wallet';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { stubWindowLayout } from '@/test/stub-window-layout';
import { SendAssetScreen } from './send-asset-screen';
import type { DigitalAssetParamList } from './digital-asset-param-list';

const Stack = createNativeStackNavigator<DigitalAssetParamList>();
type WithScanner = { Recipient: undefined; ScanToPay: { fundingToken?: string } | undefined };
const Root = createNativeStackNavigator<WithScanner>();

const SOLANA = 'Cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx4';
const EVM = '0x1111111111111111111111111111111111111111';

function solanaWallet(balances: Wallet['balances']): Wallet {
  return { id: 'sol-wallet', address: 'own', blockchain: 'SOL-DEVNET', balances };
}

function walletsHolding(...wallets: Wallet[]): WalletBalancePort {
  return { listWallets: () => Promise.resolve(ok(wallets)) };
}

const USDT_ONLY = walletsHolding(
  solanaWallet([{ tokenId: 'usdt-sol', symbol: 'USDT', amount: '42.5', decimals: 6 }]),
);

function Probe({ route }: NativeStackScreenProps<DigitalAssetParamList, 'Amount'>) {
  const { recipient } = route.params;

  return (
    <Text>{`${recipient.tokenSymbol} to ${recipient.address} over ${recipient.networkCode}`}</Text>
  );
}

function ScanProbe({ route }: NativeStackScreenProps<WithScanner, 'ScanToPay'>) {
  return <Text>{`scanning to pay from ${route.params?.fundingToken ?? 'nothing'}`}</Text>;
}

async function renderSend(
  params?: DigitalAssetParamList['Recipient'],
  wallets?: WalletBalancePort,
) {
  await renderWithProviders(
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Recipient" component={SendAssetScreen} initialParams={params} />
      <Stack.Screen name="Amount" component={Probe} />
    </Stack.Navigator>,
    {
      withNavigation: true,
      container: createTestContainer(
        wallets === undefined ? {} : { walletBalancePort: asValue(wallets) },
      ),
    },
  );

  await screen.findByRole('button', { name: /^Token/ });
}

type User = ReturnType<typeof userEvent.setup>;

async function openTokenMenu(user: User, current = 'USDC') {
  await user.press(await screen.findByRole('button', { name: `Token, ${current}` }));
}

let windowLayout: ReturnType<typeof stubWindowLayout>;

beforeEach(() => {
  windowLayout = stubWindowLayout({ x: 16, y: 136, width: 112, height: 44 });
});

afterEach(() => {
  windowLayout.mockRestore();
});

describe('choosing the wallet', () => {
  it('shows the wallet straight away when the account’s wallets are already loaded', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    queryClient.setQueryData(walletsQueryKey, [
      solanaWallet([{ tokenId: 'usdc-sol', symbol: 'USDC', amount: '5', decimals: 6 }]),
    ]);

    await renderWithProviders(
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Recipient" component={SendAssetScreen} />
      </Stack.Navigator>,
      {
        withNavigation: true,
        queryClient,
        container: createTestContainer({
          walletBalancePort: asValue({ listWallets: () => new Promise<never>(() => {}) }),
        }),
      },
    );

    expect(screen.getByRole('button', { name: 'Token, USDC' })).toBeOnTheScreen();
  });

  it('lists the wallets the account holds with their balances, starting on USDC', async () => {
    const user = userEvent.setup();
    await renderSend();

    await openTokenMenu(user);

    expect(await screen.findByRole('button', { name: 'USDC, 5,136.98 USDC' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'USDT, 0.00 USDT' })).not.toBeSelected();
    expect(screen.queryByRole('button', { name: /^SOL/ })).toBeNull();
  });

  it('leaves out a wallet the account does not hold', async () => {
    const user = userEvent.setup();
    await renderSend(
      undefined,
      walletsHolding(
        solanaWallet([{ tokenId: 'usdc-sol', symbol: 'USDC', amount: '10', decimals: 6 }]),
      ),
    );

    await openTokenMenu(user);

    expect(await screen.findByRole('button', { name: 'USDC, 10.00 USDC' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^USDT/ })).not.toBeOnTheScreen();
  });

  it('carries the chosen token, the address and Solana to the amount step', async () => {
    const user = userEvent.setup();
    await renderSend();

    await openTokenMenu(user);
    await user.press(await screen.findByRole('button', { name: /^USDT/ }));
    await user.type(screen.getByLabelText('Wallet address'), SOLANA);
    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText(`USDT to ${SOLANA} over SOL`)).toBeOnTheScreen();
  });

  it('pays from USDT when that is the only wallet the account holds', async () => {
    const user = userEvent.setup();
    await renderSend({ prefill: { address: SOLANA } }, USDT_ONLY);

    await screen.findByRole('button', { name: 'Token, USDT' });
    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText(`USDT to ${SOLANA} over SOL`)).toBeOnTheScreen();
  });

  it('keeps the wallet a scan arrived with', async () => {
    await renderSend({ prefill: { address: SOLANA, tokenSymbol: 'USDT' } });

    expect(await screen.findByRole('button', { name: 'Token, USDT' })).toBeOnTheScreen();
  });

  it('cannot continue when the account holds no wallet to send from', async () => {
    const user = userEvent.setup();
    await renderSend({ prefill: { address: SOLANA } }, walletsHolding(solanaWallet([])));

    await user.press(await screen.findByRole('button', { name: 'Token' }));

    expect(await screen.findByText('No USDC or USDT wallet to send from yet')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});

describe('scanning to pay', () => {
  it('opens scan to pay from the header, carrying the chosen wallet', async () => {
    const user = userEvent.setup();
    await renderWithProviders(
      <Root.Navigator screenOptions={{ headerShown: false }}>
        <Root.Screen name="Recipient" component={SendAssetScreen} />
        <Root.Screen name="ScanToPay" component={ScanProbe} />
      </Root.Navigator>,
      {
        withNavigation: true,
        container: createTestContainer({ walletBalancePort: asValue(USDT_ONLY) }),
      },
    );

    await screen.findByRole('button', { name: 'Token, USDT' });
    await user.press(screen.getByRole('button', { name: 'Scan to pay' }));

    expect(await screen.findByText('scanning to pay from USDT')).toBeOnTheScreen();
  });
});

describe('the network', () => {
  it('sends over Solana without asking', async () => {
    await renderSend();

    expect(await screen.findByRole('button', { name: 'Network' })).toHaveAccessibilityValue({
      text: 'Solana',
    });
  });
});

describe('arriving with an address', () => {
  it('fills in the address that was scanned', async () => {
    await renderSend({ prefill: { address: SOLANA } });

    expect(await screen.findByDisplayValue(SOLANA)).toBeOnTheScreen();
  });

  it('is ready to continue with a Solana address', async () => {
    await renderSend({ prefill: { address: SOLANA, networkCode: 'SOL' } });

    expect(await screen.findByText('Solana')).toBeOnTheScreen();
    await screen.findByRole('button', { name: 'Token, USDC' });
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it.each([
    ['an 0x address that names no chain', { address: EVM }],
    ['a saved Base wallet', { address: EVM, networkCode: 'BASE' }],
  ])('keeps %s and says sending is Solana only', async (_case, prefill) => {
    await renderSend({ prefill });

    expect(await screen.findByDisplayValue(EVM)).toBeOnTheScreen();
    expect(
      await screen.findByRole('alert', { name: /Sending is only available on Solana/ }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Network' })).toHaveAccessibilityValue({
      text: 'Solana',
    });
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});

describe('arriving with nothing', () => {
  it('opens with an empty address and asks for one', async () => {
    await renderSend(undefined);

    expect(await screen.findByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});

describe('pasting', () => {
  it('pastes the copied address, trimmed', async () => {
    const user = userEvent.setup();
    Clipboard.setString(`  ${SOLANA}\n`);
    await renderSend();

    await user.press(await screen.findByRole('button', { name: 'Paste' }));

    expect(await screen.findByDisplayValue(SOLANA)).toBeOnTheScreen();
  });

  it('ignores a clipboard that cannot hold an address', async () => {
    const user = userEvent.setup();
    Clipboard.setString('x'.repeat(500));
    await renderSend();

    await user.press(await screen.findByRole('button', { name: 'Paste' }));

    expect(screen.queryByDisplayValue(/x{10}/)).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Paste' })).toBeOnTheScreen();
  });
});
