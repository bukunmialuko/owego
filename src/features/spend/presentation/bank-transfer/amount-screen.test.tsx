import { NavigationContainer, useRoute, type RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { Keyboard, Text } from 'react-native';
import { ok } from '@/core/result/result';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type { FxRateRepository } from '@/core/fx/fx-rate';
import type { WalletBalancePort } from '@/core/wallet/wallet';
import { PaymentMethodCode } from '../../domain/entity/beneficiary-form';
import type { PayoutOrigin, PayoutRecipient } from '../../domain/entity/payout-recipient';
import { AmountScreen } from './amount-screen';
import type { BankTransferParamList } from './bank-transfer-param-list';

jest.useFakeTimers();

const NIGERIAN_RECIPIENT: PayoutRecipient = {
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

function fxExpiringIn(rate: number, milliseconds: number): FxRateRepository {
  return {
    getQuote: (baseCurrency, quoteCurrency) =>
      Promise.resolve(
        ok({
          baseCurrency,
          quoteCurrency,
          rate,
          expiresAt: new Date(Date.now() + milliseconds).toISOString(),
        }),
      ),
  };
}

const IVORIAN_RECIPIENT: PayoutRecipient = {
  ...NIGERIAN_RECIPIENT,
  currency: 'XOF',
  requiresNarration: false,
  countryCode: 'CI',
};

const AMERICAN_RECIPIENT: PayoutRecipient = {
  ...NIGERIAN_RECIPIENT,
  currency: 'USD',
  requiresNarration: false,
  countryCode: 'US',
};

const FX_ABSENT: FxRateRepository = { getQuote: () => Promise.resolve(ok(undefined)) };

const FX_PENDING: FxRateRepository = { getQuote: () => new Promise(() => undefined) };

function walletHolding(usdc: string): WalletBalancePort {
  return {
    listWallets: () =>
      Promise.resolve(
        ok([
          {
            id: 'wallet-1',
            address: '0xabc',
            blockchain: 'BASE',
            balances: [{ tokenId: 'usdc', symbol: 'USDC', amount: usdc, decimals: 6 }],
          },
        ]),
      ),
  };
}

const Flow = createNativeStackNavigator<BankTransferParamList>();

function ConfirmStub() {
  const { amountMinor, recipient, narration, origin } =
    useRoute<RouteProp<BankTransferParamList, 'Confirm'>>().params;

  return (
    <Text>
      {`confirm ${String(amountMinor)} ${recipient.currency}, narration "${narration}", ${origin}`}
    </Text>
  );
}

type RenderOptions = {
  origin?: PayoutOrigin;
  recipient?: PayoutRecipient;
  wallets?: WalletBalancePort;
};

async function renderAmount(
  fxRateRepository: FxRateRepository,
  { origin = 'transfer', recipient = NIGERIAN_RECIPIENT, wallets }: RenderOptions = {},
) {
  await renderWithProviders(
    <NavigationContainer>
      <Flow.Navigator screenOptions={{ headerShown: false }}>
        <Flow.Screen
          name="Amount"
          component={AmountScreen}
          initialParams={{ recipient, fundingToken: 'USDC', origin }}
        />
        <Flow.Screen name="Confirm" component={ConfirmStub} />
      </Flow.Navigator>
    </NavigationContainer>,
    {
      container: createTestContainer({
        fxRateRepository: asValue(fxRateRepository),
        ...(wallets === undefined ? {} : { walletBalancePort: asValue(wallets) }),
      }),
    },
  );
}

type User = ReturnType<typeof userEvent.setup>;

async function tap(user: User, keys: string[]) {
  for (const key of keys) {
    await user.press(await screen.findByRole('button', { name: key }));
  }
}

async function switchTo(user: User, currency: string) {
  const control = await screen.findByRole('button', { name: `Switch to ${currency}` });
  await waitFor(() => {
    expect(control).toBeEnabled();
  });
  await user.press(control);
}

async function typeFiveThousandNaira(user: User) {
  await switchTo(user, 'NGN');
  await tap(user, ['5', '0', '0', '0']);
  await user.type(screen.getByLabelText('Transaction narration'), 'For upkeep');
}

describe('the rate on the amount step', () => {
  it('lets the payer continue on a rate past its expiry', async () => {
    const user = userEvent.setup();
    await renderAmount(fxExpiringIn(1_500, -1_000));

    await typeFiveThousandNaira(user);

    expect(screen.queryByText(/expired/i)).not.toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText(/^confirm 500000 NGN/)).toBeOnTheScreen();
  });

  it('lets the payer continue without a narration', async () => {
    const user = userEvent.setup();
    await renderAmount(fxExpiringIn(1_500, 60_000));

    await switchTo(user, 'NGN');
    await tap(user, ['5', '0', '0', '0']);
    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('confirm 500000 NGN, narration "", transfer')).toBeOnTheScreen();
  });

  it('puts the keyboard away before opening the confirmation', async () => {
    const dismiss = jest.spyOn(Keyboard, 'dismiss');
    const user = userEvent.setup();
    await renderAmount(fxExpiringIn(1_500, 60_000));

    await typeFiveThousandNaira(user);
    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText(/^confirm 500000 NGN/)).toBeOnTheScreen();
    expect(dismiss).toHaveBeenCalled();
    dismiss.mockRestore();
  });

  it('passes on how the payment started', async () => {
    const user = userEvent.setup();
    await renderAmount(fxExpiringIn(1_500, 60_000), { origin: 'scan' });

    await typeFiveThousandNaira(user);
    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText(/, scan$/)).toBeOnTheScreen();
  });

  it('still refuses a corridor with no rate', async () => {
    const user = userEvent.setup();
    await renderAmount(FX_ABSENT);

    await tap(user, ['5', '0', '0', '0']);

    expect(await screen.findByText('We could not price this payment.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});

describe('switching the currency being typed', () => {
  it('starts in dollars, showing the rate the backend quoted', async () => {
    await renderAmount(fxExpiringIn(1_500, 60_000));

    expect(await screen.findByLabelText('Rate, $1 = ₦1,500')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Switch to NGN' })).toHaveTextContent('USD');
  });

  it('prices typed dollars in naira, and pays the naira', async () => {
    const user = userEvent.setup();
    await renderAmount(fxExpiringIn(1_500, 60_000));
    await screen.findByLabelText('Rate, $1 = ₦1,500');

    await tap(user, ['1', '0']);

    expect(screen.getByLabelText('Amount to send, $10.00')).toBeOnTheScreen();
    expect(screen.getByText('₦15,000.00')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText(/^confirm 1500000 NGN/)).toBeOnTheScreen();
  });

  it('carries the amount across when the payer switches to naira', async () => {
    const user = userEvent.setup();
    await renderAmount(fxExpiringIn(1_500, 60_000));

    await tap(user, ['1', '0']);
    await switchTo(user, 'NGN');

    expect(screen.getByLabelText('Amount to send, ₦15,000.00')).toBeOnTheScreen();
    expect(screen.getByText('$10.00')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Switch to USD' })).toHaveTextContent('NGN');

    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText(/^confirm 1500000 NGN/)).toBeOnTheScreen();
  });

  it('gives back exactly what was typed after switching there and back', async () => {
    const user = userEvent.setup();
    await renderAmount(fxExpiringIn(1_550, 60_000));

    await switchTo(user, 'NGN');
    await tap(user, ['1', '0', '0']);
    await switchTo(user, 'USD');

    expect(screen.getByLabelText('Amount to send, $0.06')).toBeOnTheScreen();

    await switchTo(user, 'NGN');

    expect(screen.getByLabelText('Amount to send, ₦100.00')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText(/^confirm 10000 NGN/)).toBeOnTheScreen();
  });

  it('converts afresh once the amount is edited after a switch', async () => {
    const user = userEvent.setup();
    await renderAmount(fxExpiringIn(1_500, 60_000));

    await tap(user, ['1', '0']);
    await switchTo(user, 'NGN');
    await tap(user, ['Clear', 'Clear', 'Clear', 'Clear']);
    await switchTo(user, 'USD');

    expect(screen.getByLabelText('Amount to send, $1.00')).toBeOnTheScreen();
  });

  it('keeps the cents when switching out of a currency without them', async () => {
    const user = userEvent.setup();
    await renderAmount(fxExpiringIn(600, 60_000), { recipient: IVORIAN_RECIPIENT });

    await switchTo(user, 'XOF');
    await tap(user, ['6', '0', '0', '5']);
    await switchTo(user, 'USD');

    expect(screen.getByLabelText('Amount to send, $10.01')).toBeOnTheScreen();
  });

  it('pays a zero-decimal amount at the scale the backend expects', async () => {
    const user = userEvent.setup();
    await renderAmount(fxExpiringIn(600, 60_000), { recipient: IVORIAN_RECIPIENT });

    await switchTo(user, 'XOF');
    await tap(user, ['6', '0', '0', '5']);
    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText(/^confirm 600500 XOF/)).toBeOnTheScreen();
  });

  it('shows no rate while one is still being fetched', async () => {
    const user = userEvent.setup();
    await renderAmount(FX_PENDING);

    await tap(user, ['5']);

    expect(screen.getByRole('button', { name: 'Switch to NGN' })).toBeDisabled();
    expect(screen.queryByText(/₦/)).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('offers no switch and no rate on a dollar payout', async () => {
    const user = userEvent.setup();
    await renderAmount(FX_PENDING, { recipient: AMERICAN_RECIPIENT });

    await tap(user, ['5', '0']);

    expect(screen.queryByRole('button', { name: /^Switch to/ })).not.toBeOnTheScreen();
    expect(screen.queryByText(/=/)).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText(/^confirm 5000 USD/)).toBeOnTheScreen();
  });

  it('shows the balance in the currency being typed', async () => {
    const user = userEvent.setup();
    await renderAmount(fxExpiringIn(1_500, 60_000), { wallets: walletHolding('100') });

    expect(await screen.findByLabelText('Wallet balance, $100.00')).toBeOnTheScreen();

    await switchTo(user, 'NGN');

    expect(await screen.findByLabelText('Wallet balance, ₦150,000.00')).toBeOnTheScreen();
  });
});
