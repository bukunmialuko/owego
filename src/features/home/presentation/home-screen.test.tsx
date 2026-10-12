import { NavigationContainer, useRoute, type RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { act, screen, userEvent, within } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { isValidElement } from 'react';
import { Text, type RefreshControlProps } from 'react-native';
import { darkTheme, lightTheme } from '@/core/design-system';
import { ok } from '@/core/result/result';
import { offline } from '@/core/errors/app-error';
import { err } from '@/core/result/result';
import type { Payee } from '@/core/payee/payee';
import { PreferenceKey } from '@/core/storage/storage-keys';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type { TransactionRepository } from '../domain/repository/home-repository';
import type { Wallet, WalletBalancePort } from '@/core/wallet/wallet';
import { HomeScreen } from './home-screen';

jest.useFakeTimers();

function renderHome(
  overrides: Partial<{
    walletBalancePort: WalletBalancePort;
    transactions: TransactionRepository;
  }> = {},
  theme: 'light' | 'dark' = 'light',
) {
  return renderWithProviders(<HomeScreen />, {
    theme,
    withNavigation: true,
    container: createTestContainer({
      ...(overrides.walletBalancePort && {
        walletBalancePort: asValue(overrides.walletBalancePort),
      }),
      ...(overrides.transactions && { transactionRepository: asValue(overrides.transactions) }),
    }),
  });
}

function paintedGradients(): string[] {
  const names: string[] = [];

  const walk = (node: unknown): void => {
    if (node === null || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);

      return;
    }
    const candidate = node as {
      type?: unknown;
      props?: Record<string, unknown>;
      children?: unknown[];
    };
    const name = candidate.props?.['name'];
    if (candidate.type === 'RNSVGLinearGradient' && typeof name === 'string') names.push(name);
    candidate.children?.forEach(walk);
  };

  walk(screen.toJSON());

  return names;
}

const emptyWallets: WalletBalancePort = { listWallets: () => Promise.resolve(ok([])) };

function holding(amounts: Record<string, string>): WalletBalancePort {
  const wallet: Wallet = {
    id: 'wallet-sol',
    address: 'address',
    blockchain: 'SOL-DEVNET',
    balances: Object.entries(amounts).map(([symbol, amount]) => ({
      tokenId: `${symbol}-sol`,
      symbol,
      amount,
      decimals: 6,
    })),
  };

  return { listWallets: () => Promise.resolve(ok([wallet])) };
}

function containerShowing(currency: string) {
  const container = createTestContainer();
  container.resolve('displayCurrencyStore').getState().select(currency);

  return container;
}
const noTransactions: TransactionRepository = { getRecent: () => Promise.resolve(ok([])) };

type TreeNode = { parent: TreeNode | null; props: Record<string, unknown> };

function ancestorsOf(node: TreeNode): TreeNode[] {
  return node.parent === null ? [] : [node.parent, ...ancestorsOf(node.parent)];
}

function refreshControl(): RefreshControlProps {
  const scrollView = ancestorsOf(screen.getByLabelText('$5,136.98')).find(
    (node) => node.props['refreshControl'] !== undefined,
  );
  const control = scrollView?.props['refreshControl'];
  if (!isValidElement<RefreshControlProps>(control)) throw new Error('Home has no refresh control');

  return control.props;
}

const Stack = createNativeStackNavigator();

function ReceiptProbe() {
  const { transactionId } =
    useRoute<RouteProp<{ TransactionDetails: { transactionId: string } }>>().params;

  return <Text>{`Receipt for ${transactionId}`}</Text>;
}

function HomeWithReceipt() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="TransactionDetails" component={ReceiptProbe} />
        <Stack.Screen name="AllTransactions" component={HistoryProbe} />
        <Stack.Screen name="ScanToPay" component={ScanToPayProbe} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const PAYEES: Payee[] = [
  {
    id: 'p1',
    name: 'Hannah Nuggest',
    tint: 'brand',
    destination: {
      kind: 'bankTransfer',
      prefill: {
        currency: 'NGN',
        method: 'bank_transfer',
        values: { bankCode: '058', accountNumber: '0123456789' },
      },
    },
  },
  {
    id: 'p2',
    name: 'Main wallet',
    tint: 'success',
    destination: {
      kind: 'walletSend',
      prefill: { address: 'Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx3', networkCode: 'SOL' },
    },
  },
  { id: 'p3', name: 'Precious Jameson', tint: 'error', destination: { kind: 'details' } },
  {
    id: 'p4',
    name: 'Corner café',
    tint: 'warning',
    destination: { kind: 'merchantPay', qrString: '000201010211MERCHANTCODE6304ABCD' },
  },
];

function RouteProbe() {
  const route = useRoute();

  return <Text>{`${route.name} ${JSON.stringify(route.params)}`}</Text>;
}

function HomeWithPayments() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="BankTransfer" component={RouteProbe} />
        <Stack.Screen name="SendAsset" component={RouteProbe} />
        <Stack.Screen name="Beneficiaries" component={RouteProbe} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function HistoryProbe() {
  return <Text>Full history</Text>;
}

function ScanToPayProbe() {
  return <Text>Scan to pay probe</Text>;
}

describe('HomeScreen', () => {
  it('shows the balance the wallet reports', async () => {
    await renderHome();

    expect(await screen.findByLabelText('$5,136.98')).toBeTruthy();
  });

  it('adds every wallet together and rounds down rather than up', async () => {
    await renderHome({ walletBalancePort: holding({ USDC: '30.828566', USDT: '1' }) });

    expect(await screen.findByLabelText('$31.82')).toBeTruthy();
  });

  it('keeps the balance in dollars and shows it in the picked currency beneath', async () => {
    await renderWithProviders(<HomeScreen />, {
      withNavigation: true,
      container: containerShowing('NGN'),
    });

    expect(await screen.findByLabelText('$5,136.98')).toBeTruthy();
    expect(await screen.findByText('₦3,801.36')).toBeTruthy();
    expect(screen.getByText('🇳🇬')).toBeTruthy();
  });

  it('shows the dollar balance while the rate is still loading', async () => {
    const container = createTestContainer({
      fxRateRepository: asValue({ getQuote: () => new Promise(() => undefined) }),
    });
    container.resolve('displayCurrencyStore').getState().select('NGN');

    await renderWithProviders(<HomeScreen />, { withNavigation: true, container });

    expect(await screen.findByLabelText('$5,136.98')).toBeTruthy();
    expect(screen.queryByText(/₦/)).toBeNull();
  });

  it('hides the balance on request and says so', async () => {
    const user = userEvent.setup();
    await renderHome();

    await user.press(await screen.findByRole('button', { name: 'Hide balance' }));

    expect(screen.queryByLabelText('$5,136.98')).toBeNull();
    expect(screen.getByRole('button', { name: 'Show balance' })).toBeTruthy();
  });

  it('holds a row’s place in the list while the transactions load', async () => {
    await renderHome({ transactions: { getRecent: () => new Promise(() => undefined) } });

    const placeholders = await screen.findAllByTestId('transaction-row-placeholder', {
      includeHiddenElements: true,
    });
    expect(placeholders).toHaveLength(3);
    expect(placeholders[0]).toHaveStyle({ paddingVertical: lightTheme.spacing.sm });
  });

  it('keeps the recent transactions compact top and bottom', async () => {
    await renderHome();

    const row = await screen.findByLabelText(/Deposit, \+\$50\.00/);

    expect(row.children[0]).toHaveStyle({ paddingVertical: lightTheme.spacing.sm });
    expect(row.parent).toHaveStyle({
      padding: lightTheme.spacing.md,
      paddingVertical: lightTheme.spacing.xs,
    });
  });

  it('lists recent transactions with their direction', async () => {
    await renderHome();

    expect(await screen.findByLabelText(/Deposit, \+\$50\.00/)).toBeTruthy();
    expect(screen.getByLabelText(/Transfer to Hannah, -\$50\.00/)).toBeTruthy();
  });

  it('draws money added in green and money out in the primary ink', async () => {
    await renderHome();

    const deposit = await screen.findByLabelText(/Deposit, \+\$50\.00/);
    const transfer = screen.getByLabelText(/Transfer to Hannah, -\$50\.00/);

    expect(within(deposit).getByText('+$50.00')).toHaveStyle({
      color: lightTheme.color.textSuccess,
    });
    expect(within(transfer).getByText('-$50.00')).toHaveStyle({
      color: lightTheme.color.textPrimary,
    });
  });

  it('opens the receipt of the transaction tapped', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderWithProviders(<HomeWithReceipt />, { container: createTestContainer() });

    await user.press(await screen.findByLabelText(/Transfer to Hannah, -\$50\.00/));

    expect(await screen.findByText('Receipt for t2')).toBeOnTheScreen();
  });

  it('opens the full history from See all', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderWithProviders(<HomeWithReceipt />, { container: createTestContainer() });

    await user.press(await screen.findByRole('button', { name: 'See all' }));

    expect(await screen.findByText('Full history')).toBeOnTheScreen();
  });

  it('opens scan to pay from the header', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderWithProviders(<HomeWithReceipt />, { container: createTestContainer() });

    await user.press(await screen.findByRole('button', { name: 'Scan to pay' }));

    expect(await screen.findByText('Scan to pay probe')).toBeOnTheScreen();
  });

  it.each([
    ['light', lightTheme],
    ['dark', darkTheme],
  ] as const)('draws the scan shortcut on a neutral disc in %s mode', async (mode, theme) => {
    await renderHome({}, mode);

    expect(await screen.findByRole('button', { name: 'Scan to pay' })).toHaveStyle({
      backgroundColor: theme.color.fillNeutral,
    });
  });

  it.each(['light', 'dark'] as const)(
    'lays the dashboard on a flat surface in %s mode',
    async (mode) => {
      await renderHome({}, mode);

      await screen.findByRole('button', { name: 'Make payment' });
      expect(paintedGradients()).not.toContain('canvas');
      expect(paintedGradients()).toContain('bottomFadeSurface');
    },
  );

  it('keeps transaction avatars light in dark mode', async () => {
    await renderHome({}, 'dark');

    const initials = await screen.findByText('D');
    expect(initials).toHaveStyle({ color: lightTheme.color.textBrand });
    expect(initials.parent).toHaveStyle({ backgroundColor: lightTheme.color.fillNeutralSubtle });
  });

  it('leads each transaction with a disc a little taller than its two lines', async () => {
    const { size, spacing, typography } = lightTheme;
    const twoLines =
      typography['body.mEmphasis'].lineHeight + spacing.xxs + typography['body.s'].lineHeight;
    await renderHome();

    const initials = await screen.findByText('D');

    expect(initials.parent).toHaveStyle({ width: size.avatar.row, height: size.avatar.row });
    expect(size.avatar.row).toBeGreaterThan(twoLines);
  });

  it('offers a way to add funds when there is nothing to show', async () => {
    await renderHome({ walletBalancePort: emptyWallets, transactions: noTransactions });

    expect(await screen.findByText("There's nothing here yet")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Receive' })).toBeTruthy();
  });

  it('keeps the dashboard when there is a balance but no activity yet', async () => {
    await renderHome({ transactions: noTransactions });

    expect(await screen.findByText('No transactions yet')).toBeTruthy();
    expect(screen.queryByText("There's nothing here yet")).toBeNull();
  });

  it('announces a failed balance load instead of showing zero', async () => {
    await renderHome({
      walletBalancePort: { listWallets: () => Promise.resolve(err(offline())) },
    });

    expect(await screen.findByRole('alert', { name: /Balance unavailable/ })).toBeTruthy();
  });

  it('shows nothing under a dollar balance', async () => {
    await renderHome();

    await screen.findByLabelText('$5,136.98');
    expect(screen.queryByText(/^[\u{1F1E6}-\u{1F1FF}]{2}$/u)).toBeNull();
    expect(screen.queryByText(/=/)).toBeNull();
  });

  it('shows the converted balance as something to read, not to tap', async () => {
    await renderWithProviders(<HomeScreen />, {
      withNavigation: true,
      container: containerShowing('NGN'),
    });

    const chip = await screen.findByText('₦3,801.36');
    expect(ancestorsOf(chip).some((node) => node.props['accessibilityRole'] === 'button')).toBe(
      false,
    );
  });

  it('shows only the rate under a hidden balance', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<HomeScreen />, {
      withNavigation: true,
      container: containerShowing('NGN'),
    });

    await user.press(await screen.findByRole('button', { name: 'Hide balance' }));

    expect(await screen.findByText('$1 = ₦0.74')).toBeTruthy();
    expect(screen.queryByText('₦3,801.36')).toBeNull();
  });

  it('masks only the figure when a dollar balance is hidden', async () => {
    const user = userEvent.setup();
    await renderHome();

    await user.press(await screen.findByRole('button', { name: 'Hide balance' }));

    expect(screen.getAllByText('✱✱✱✱')).toHaveLength(1);
    expect(screen.queryByText(/=/)).toBeNull();
  });

  it('breaks the balance down by stablecoin from the figure, rounded down', async () => {
    const user = userEvent.setup();
    await renderHome({ walletBalancePort: holding({ USDC: '30.828566', USDT: '1', SOL: '9' }) });

    await user.press(await screen.findByRole('button', { name: '$31.82' }));

    expect(await screen.findByText('Wallet breakdown')).toBeTruthy();
    expect(screen.getByText('30.82 USDC')).toBeTruthy();
    expect(screen.getByText('1.00 USDT')).toBeTruthy();
    expect(screen.queryByText(/SOL/)).toBeNull();
  });

  it('masks the breakdown while the balance is hidden', async () => {
    const user = userEvent.setup();
    await renderHome();

    await user.press(await screen.findByRole('button', { name: 'Hide balance' }));
    await user.press(await screen.findByRole('button', { name: 'Balance hidden' }));

    expect(await screen.findByText('Wallet breakdown')).toBeTruthy();
    expect(screen.getAllByText('✱✱✱✱')).toHaveLength(3);
    expect(screen.queryByText(/\d\.\d{2} USD[CT]$/)).toBeNull();
  });

  it('starts hidden when the device already remembers that choice', async () => {
    const container = createTestContainer();
    container.resolve('cache').setString(PreferenceKey.BalanceHidden, 'true');

    await renderWithProviders(<HomeScreen />, { withNavigation: true, container });

    expect(await screen.findByRole('button', { name: 'Show balance' })).toBeTruthy();
    expect(screen.queryByLabelText('$5,136.98')).toBeNull();
  });

  it('offers the people who were paid most recently', async () => {
    await renderHome();

    expect(await screen.findByRole('button', { name: 'Lena Fischer' })).toBeTruthy();
    expect(screen.getByText('Lena')).toBeTruthy();
  });

  it.each([
    [
      'a bank payee to the transfer form, filled in',
      'Hannah Nuggest',
      'BankTransfer {"screen":"Recipient","params":{"prefill":{"currency":"NGN","method":"bank_transfer","values":{"bankCode":"058","accountNumber":"0123456789"}}}}',
    ],
    [
      'a wallet to Send, filled in',
      'Main wallet',
      'SendAsset {"screen":"Recipient","params":{"prefill":{"address":"Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx3","networkCode":"SOL"}}}',
    ],
    [
      'a payee no form can pay to their details',
      'Precious Jameson',
      'Beneficiaries {"screen":"Details","params":{"beneficiaryId":"p3"}}',
    ],
    [
      'a saved merchant to its amount page, with its code and nothing else',
      'Corner café',
      'BankTransfer {"screen":"MerchantAmount","params":{"qrString":"000201010211MERCHANTCODE6304ABCD"}}',
    ],
  ])('opens %s from the quick-send row', async (_case, face, landed) => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderWithProviders(<HomeWithPayments />, {
      container: createTestContainer({
        payeePort: asValue({ getRecent: () => Promise.resolve(ok(PAYEES)) }),
      }),
    });

    await user.press(await screen.findByRole('button', { name: face }));

    expect(await screen.findByText(landed)).toBeOnTheScreen();
  });

  it('announces a verified account and lets it be dismissed', async () => {
    const user = userEvent.setup();
    await renderHome();

    const banner = await screen.findByRole('alert', { name: /verified successfully/ });
    expect(banner).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Dismiss' }));

    expect(screen.queryByText(/verified successfully/)).toBeNull();
  });

  it('keeps the app bar in place while the dashboard scrolls', async () => {
    await renderHome();

    const balance = await screen.findByLabelText('$5,136.98');
    const scrollView = ancestorsOf(balance).find(
      (node) => node.props['refreshControl'] !== undefined,
    );

    expect(scrollView).toBeDefined();
    expect(ancestorsOf(screen.getByRole('button', { name: 'Profile' }))).not.toContain(scrollView);
    expect(ancestorsOf(screen.getByRole('alert', { name: /verified successfully/ }))).not.toContain(
      scrollView,
    );
  });

  it('leaves a refresh to the native spinner', async () => {
    const preview = createTestContainer().resolve('walletBalancePort');
    let isHeld = false;
    await renderHome({
      walletBalancePort: {
        listWallets: () => (isHeld ? new Promise(() => {}) : preview.listWallets()),
      },
    });
    await screen.findByLabelText('$5,136.98');

    isHeld = true;
    await act(() => {
      refreshControl().onRefresh?.();
    });

    expect(refreshControl().refreshing).toBe(true);
    expect(screen.queryByText('Refreshing balance')).toBeNull();
  });

  it('renders in dark mode without losing its controls', async () => {
    await renderHome({}, 'dark');

    expect(await screen.findByRole('button', { name: 'Make payment' })).toBeTruthy();
  });
});
