import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { Share, Text } from 'react-native';
import { darkTheme, lightTheme } from '@/core/design-system';
import { ok, type Result } from '@/core/result/result';
import { useWalletsQuery } from '@/core/wallet/use-wallets-query';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { buildMerchantCode } from '@/test/qr-payloads';
import type { AppError } from '@/core/errors/app-error';
import type { ThemePreference } from '@/core/design-system/theme-provider';
import type { Wallet, WalletBalancePort } from '@/core/wallet/wallet';
import { PaymentMethodCode } from '../../domain/entity/beneficiary-form';
import type { PayoutQuote } from '../../domain/entity/payout-quote';
import type { PayoutRecipient } from '../../domain/entity/payout-recipient';
import type { SentOutcome } from '../../domain/entity/send-outcome';
import { resolveMerchantCode } from '../../domain/usecase/resolve-merchant-code-usecase';
import { SuccessScreen } from './success-screen';

jest.useFakeTimers();

const RECIPIENT: PayoutRecipient = {
  displayName: 'Hannah Nuggest',
  subtitle: 'Guaranty Trust Bank • 0123456789',
  currency: 'NGN',
  method: PaymentMethodCode.BankTransfer,
  rail: 'bank_transfer',
  endpoint: '/transaction/wallet-to-bank',
  requiresNarration: true,
  limits: [],
  countryCode: 'NG',
  values: { bankCode: '058', accountNumber: '0123456789' },
  labels: { bankCode: 'Guaranty Trust Bank' },
};

const QUOTE: PayoutQuote = {
  destination: {
    recipientGetsMinor: 150_000,
    feeMinor: 3_000,
    totalMinor: 153_000,
    currency: 'NGN',
  },
  wallet: { recipientGetsMinor: 100, feeMinor: 2, totalMinor: 102, currency: 'USD' },
  rate: 1_500,
};

function walletsAnsweringOnce() {
  const listWallets = jest.fn((): Promise<Result<Wallet[], AppError>> =>
    listWallets.mock.calls.length === 1 ? Promise.resolve(ok([])) : new Promise(() => undefined),
  );

  return { listWallets } satisfies WalletBalancePort;
}

const Root = createNativeStackNavigator();
const Flow = createNativeStackNavigator();

function BehindTheFlow() {
  useWalletsQuery();

  return <Text>the screen the flow was opened from</Text>;
}

function FlowNavigator() {
  return (
    <Flow.Navigator screenOptions={{ headerShown: false }}>
      <Flow.Screen name="Success" component={SuccessScreen} />
    </Flow.Navigator>
  );
}

function TestApp({ outcome, recipient }: { outcome: SentOutcome; recipient: PayoutRecipient }) {
  return (
    <NavigationContainer
      initialState={{
        index: 1,
        routes: [
          { name: 'Behind' },
          {
            name: 'Flow',
            state: {
              index: 0,
              routes: [{ name: 'Success', params: { recipient, quote: QUOTE, outcome } }],
            },
          },
        ],
      }}
    >
      <Root.Navigator screenOptions={{ headerShown: false }}>
        <Root.Screen name="Behind" component={BehindTheFlow} />
        <Root.Screen name="Flow" component={FlowNavigator} />
      </Root.Navigator>
    </NavigationContainer>
  );
}

function renderReceipt({
  outcome = 'sent',
  theme = 'light',
  wallets = walletsAnsweringOnce(),
  recipient = RECIPIENT,
}: {
  outcome?: SentOutcome;
  theme?: ThemePreference;
  wallets?: WalletBalancePort;
  recipient?: PayoutRecipient;
} = {}) {
  return renderWithProviders(<TestApp outcome={outcome} recipient={recipient} />, {
    theme,
    container: createTestContainer({ walletBalancePort: asValue(wallets) }),
  });
}

describe('what the receipt says', () => {
  it('calls a merchant whose code names nobody "(No merchant name)", here and when shared', async () => {
    const resolved = resolveMerchantCode(buildMerchantCode({ merchantName: '' }));
    if (resolved.kind !== 'merchant') throw new Error('the code should be payable');
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    const user = userEvent.setup();
    await renderReceipt({ recipient: resolved.recipient });

    expect(await screen.findByLabelText('To, (No merchant name), VND')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Share receipt' }));

    const [content] = share.mock.calls[0] ?? [];
    expect(content !== undefined && 'message' in content ? content.message : '').toContain(
      '(No merchant name)',
    );
    share.mockRestore();
  });

  it('shows the payout as the backend priced it', async () => {
    await renderReceipt();

    expect(await screen.findByText('Transaction successful')).toBeOnTheScreen();
    expect(screen.getByText(/^₦1,500$/)).toBeOnTheScreen();
    expect(screen.getByText('$1.00')).toBeOnTheScreen();
    expect(screen.getByLabelText(/Total amount paid, ₦1,530\.00/)).toBeOnTheScreen();
    expect(screen.getByText(' ($1.02)')).toBeOnTheScreen();
    expect(screen.getByLabelText(/Rate, \$1\.00 = ₦1,500\.00/)).toBeOnTheScreen();
  });

  it('says a processing payout is processing, and to check before sending again', async () => {
    await renderReceipt({ outcome: 'processing' });

    expect(await screen.findByText('Payment processing')).toBeOnTheScreen();
    expect(screen.getByText(/Check your transactions before you send it again/)).toBeOnTheScreen();
    expect(screen.queryByText('Transaction successful')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Share receipt' })).not.toBeOnTheScreen();
  });

  it('says an unconfirmed payout could not be confirmed', async () => {
    await renderReceipt({ outcome: 'unconfirmed' });

    expect(await screen.findByText('Payment not confirmed')).toBeOnTheScreen();
    expect(screen.queryByText('Transaction successful')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Share receipt' })).not.toBeOnTheScreen();
  });
});

describe('closing the receipt', () => {
  it('closes the whole payout flow, not just the receipt', async () => {
    const user = userEvent.setup();
    await renderReceipt();

    await user.press(await screen.findByRole('button', { name: 'Close' }));

    expect(await screen.findByText('the screen the flow was opened from')).toBeOnTheScreen();
    expect(screen.queryByText('Transaction successful')).not.toBeOnTheScreen();
  });

  it('refreshes the wallets when the payer taps Done, and leaves without waiting', async () => {
    const wallets = walletsAnsweringOnce();
    const user = userEvent.setup();
    await renderReceipt({ wallets });

    await user.press(await screen.findByRole('button', { name: 'Done' }));

    expect(await screen.findByText('the screen the flow was opened from')).toBeOnTheScreen();
    expect(wallets.listWallets).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['light', lightTheme],
    ['dark', darkTheme],
  ] as const)('draws its close on the surface disc in %s mode', async (mode, theme) => {
    await renderReceipt({ theme: mode });

    expect(await screen.findByRole('button', { name: 'Close' })).toHaveStyle({
      backgroundColor: theme.color.bgSurface,
    });
  });
});
