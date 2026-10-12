import { NavigationContainer, useRoute, type RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { Text } from 'react-native';
import { serverError } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import type { FxRateRepository } from '@/core/fx/fx-rate';
import type { Wallet, WalletBalancePort } from '@/core/wallet/wallet';
import { buildMerchantCode } from '@/test/qr-payloads';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { stubWindowLayout } from '@/test/stub-window-layout';
import { MerchantAmountScreen } from './merchant-amount-screen';
import type { BankTransferParamList } from './bank-transfer-param-list';

jest.useFakeTimers();

const DONG_RATE: FxRateRepository = {
  getQuote: (baseCurrency, quoteCurrency) =>
    Promise.resolve(ok({ baseCurrency, quoteCurrency, rate: 25_000 })),
};

const FX_PENDING: FxRateRepository = { getQuote: () => new Promise(() => undefined) };

const FX_REFUSED: FxRateRepository = {
  getQuote: () => Promise.resolve(err(serverError(400, 'brails API error: status 400'))),
};

const BALANCES: Wallet['balances'] = [
  { tokenId: 'usdc-sol', symbol: 'USDC', amount: '5136.98', decimals: 6 },
  { tokenId: 'usdt-sol', symbol: 'USDT', amount: '42.5', decimals: 6 },
];

const WALLETS: WalletBalancePort = {
  listWallets: () =>
    Promise.resolve(
      ok([{ id: 'sol-wallet', address: 'own', blockchain: 'SOL', balances: BALANCES }]),
    ),
};

const STICKER = buildMerchantCode({ merchantName: 'PHO 24' });
const BILL = buildMerchantCode({ merchantName: 'PHO 24', amount: '100000' });

const Root = createNativeStackNavigator();
const Flow = createNativeStackNavigator<BankTransferParamList>();

function ConfirmStub() {
  const { amountMinor, recipient, fundingToken, narration, origin } =
    useRoute<RouteProp<BankTransferParamList, 'Confirm'>>().params;

  return (
    <Text>
      {`confirm ${String(amountMinor)} ${recipient.currency} via ${recipient.endpoint} ` +
        `from ${fundingToken}, ${origin}, narration "${narration}", code ${recipient.values['qrString'] ?? ''}`}
    </Text>
  );
}

function ScannerStub() {
  return <Text>the scanner</Text>;
}

async function renderMerchantAmount(
  qrString: string,
  { fx = DONG_RATE, fundingToken }: { fx?: FxRateRepository; fundingToken?: string } = {},
) {
  const params = { qrString, ...(fundingToken === undefined ? {} : { fundingToken }) };

  function FlowNavigator() {
    return (
      <Flow.Navigator screenOptions={{ headerShown: false }}>
        <Flow.Screen
          name="MerchantAmount"
          component={MerchantAmountScreen}
          initialParams={params}
        />
        <Flow.Screen name="Confirm" component={ConfirmStub} />
      </Flow.Navigator>
    );
  }

  await renderWithProviders(
    <NavigationContainer
      initialState={{ index: 1, routes: [{ name: 'Scanner' }, { name: 'Flow' }] }}
    >
      <Root.Navigator screenOptions={{ headerShown: false }}>
        <Root.Screen name="Scanner" component={ScannerStub} />
        <Root.Screen name="Flow" component={FlowNavigator} />
      </Root.Navigator>
    </NavigationContainer>,
    {
      container: createTestContainer({
        fxRateRepository: asValue(fx),
        walletBalancePort: asValue(WALLETS),
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

function continueButton() {
  return screen.getByRole('button', { name: 'Continue' });
}

describe('a code that names its amount', () => {
  it('hands Confirm the amount the code names, in its currency, with the code untouched', async () => {
    const user = userEvent.setup();
    await renderMerchantAmount(BILL);

    await user.press(await screen.findByRole('button', { name: 'Continue' }));

    expect(
      await screen.findByText(
        `confirm 10000000 VND via /transaction/qr-pay from USDC, scan, narration "", code ${BILL}`,
      ),
    ).toBeOnTheScreen();
  });

  it('shows the amount to pay in dollars, with the merchant’s own figure beneath, and no keypad', async () => {
    await renderMerchantAmount(BILL);

    expect(await screen.findByText('Amount to pay')).toBeOnTheScreen();
    expect(await screen.findByLabelText('Amount to pay, $4.00')).toBeOnTheScreen();
    expect(screen.getByText('₫100,000')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: '1' })).not.toBeOnTheScreen();
  });

  it('lets the payer continue before the dollar estimate arrives', async () => {
    const user = userEvent.setup();
    await renderMerchantAmount(BILL, { fx: FX_PENDING });

    await screen.findByText('Amount to pay');
    expect(screen.getByText('₫100,000')).toBeOnTheScreen();
    await user.press(continueButton());

    expect(await screen.findByText(/^confirm 10000000 VND/)).toBeOnTheScreen();
  });
});

describe('a code that leaves the amount to the payer', () => {
  it('starts at nothing, in dollars, with Continue shut', async () => {
    await renderMerchantAmount(STICKER);

    expect(await screen.findByLabelText('Amount to send, $0.00')).toBeOnTheScreen();
    expect(await screen.findByLabelText('Rate, $1 = ₫25,000')).toBeOnTheScreen();
    expect(continueButton()).toBeDisabled();
  });

  it('submits the merchant’s currency when the payer types dollars', async () => {
    const user = userEvent.setup();
    await renderMerchantAmount(STICKER);

    await screen.findByLabelText('Rate, $1 = ₫25,000');
    await tap(user, ['4']);
    await user.press(continueButton());

    expect(
      await screen.findByText(/^confirm 10000000 VND via \/transaction\/qr-pay/),
    ).toBeOnTheScreen();
  });

  it('lets the payer type the exact price the till shows', async () => {
    const user = userEvent.setup();
    await renderMerchantAmount(STICKER);

    const control = await screen.findByRole('button', { name: 'Switch to VND' });
    await waitFor(() => {
      expect(control).toBeEnabled();
    });
    await user.press(control);
    await tap(user, ['1', '2', '3', '4', '5', '6']);
    await user.press(continueButton());

    expect(await screen.findByText(/^confirm 12345600 VND/)).toBeOnTheScreen();
  });

  it('hands Confirm the code character for character', async () => {
    const user = userEvent.setup();
    await renderMerchantAmount(STICKER);

    await screen.findByLabelText('Rate, $1 = ₫25,000');
    await tap(user, ['4']);
    await user.press(continueButton());

    expect(await screen.findByText(new RegExp(`code ${STICKER}$`))).toBeOnTheScreen();
  });
});

describe('either kind of code', () => {
  it('names the merchant from the code', async () => {
    await renderMerchantAmount(STICKER);

    expect(await screen.findByLabelText('To, PHO 24, VND')).toBeOnTheScreen();
  });

  it('calls a merchant whose code names nobody "(No merchant name)"', async () => {
    await renderMerchantAmount(buildMerchantCode({ merchantName: '' }));

    expect(await screen.findByLabelText('To, (No merchant name), VND')).toBeOnTheScreen();
  });

  it('shows the wallet balance the payment draws on', async () => {
    await renderMerchantAmount(BILL);

    expect(await screen.findByLabelText('Wallet balance, $5,136.98')).toBeOnTheScreen();
  });

  it('pays from the wallet the payer picks', async () => {
    const windowLayout = stubWindowLayout({ x: 120, y: 260, width: 132, height: 48 });
    const user = userEvent.setup();
    await renderMerchantAmount(BILL);

    await user.press(await screen.findByRole('button', { name: 'Token, USDC' }));
    await user.press(await screen.findByRole('button', { name: /^USDT/ }));
    await user.press(continueButton());

    expect(
      await screen.findByText(/^confirm 10000000 VND via \/transaction\/qr-pay from USDT/),
    ).toBeOnTheScreen();
    windowLayout.mockRestore();
  });

  it('starts on the wallet it was opened with', async () => {
    await renderMerchantAmount(BILL, { fundingToken: 'USDT' });

    expect(await screen.findByRole('button', { name: 'Token, USDT' })).toBeOnTheScreen();
  });
});

describe('without a dollar rate', () => {
  it('lets the payer type the merchant’s own currency, and submits exactly that', async () => {
    const user = userEvent.setup();
    await renderMerchantAmount(STICKER, { fx: FX_REFUSED });

    expect(await screen.findByLabelText('Amount to send, ₫0')).toBeOnTheScreen();
    await tap(user, ['4', '5', '0', '0', '0']);
    expect(screen.getByLabelText('Amount to send, ₫45,000')).toBeOnTheScreen();
    await user.press(continueButton());

    expect(
      await screen.findByText(/^confirm 4500000 VND via \/transaction\/qr-pay/),
    ).toBeOnTheScreen();
  });

  it('says which currency the payer is typing in', async () => {
    await renderMerchantAmount(STICKER, { fx: FX_REFUSED });

    expect(await screen.findByText('Enter the amount in Vietnamese Dong')).toBeOnTheScreen();
  });

  it('does not tell the payer the payment cannot be priced', async () => {
    await renderMerchantAmount(STICKER, { fx: FX_REFUSED });

    await screen.findByLabelText('Amount to send, ₫0');

    expect(screen.queryByText('We could not price this payment.')).not.toBeOnTheScreen();
  });

  it('still pays a code that names its own amount', async () => {
    const user = userEvent.setup();
    await renderMerchantAmount(BILL, { fx: FX_REFUSED });

    expect(await screen.findByLabelText('Amount to pay, ₫100,000')).toBeOnTheScreen();
    await user.press(continueButton());

    expect(await screen.findByText(/^confirm 10000000 VND/)).toBeOnTheScreen();
  });
});

describe('the currency’s limits', () => {
  it('holds Continue below the currency’s minimum, and names it', async () => {
    const user = userEvent.setup();
    await renderMerchantAmount(STICKER, { fx: FX_REFUSED });

    await screen.findByLabelText('Amount to send, ₫0');
    await tap(user, ['5', '0', '0', '0']);

    expect(screen.getByText('Enter at least ₫10,000')).toBeOnTheScreen();
    expect(continueButton()).toBeDisabled();

    await tap(user, ['0']);
    expect(screen.queryByText('Enter at least ₫10,000')).not.toBeOnTheScreen();
    expect(continueButton()).toBeEnabled();
  });

  it('holds Continue below the rupiah minimum', async () => {
    const user = userEvent.setup();
    await renderMerchantAmount(buildMerchantCode({ currencyNumeric: '360', country: 'ID' }), {
      fx: FX_REFUSED,
    });

    await screen.findByText('Enter the amount in Indonesian Rupiah');
    await tap(user, ['2', '5']);

    expect(screen.getByText('Enter at least Rp 1,000.00')).toBeOnTheScreen();
    expect(continueButton()).toBeDisabled();
  });

  it('says a code asking for less than the minimum cannot be paid', async () => {
    await renderMerchantAmount(buildMerchantCode({ amount: '5000' }));

    expect(
      await screen.findByText(
        'This code asks for less than the ₫10,000 minimum, so it can’t be paid.',
      ),
    ).toBeOnTheScreen();
    expect(continueButton()).toBeDisabled();
  });

  it('applies no maximum', async () => {
    const user = userEvent.setup();
    await renderMerchantAmount(buildMerchantCode({ amount: '20000000' }));

    await user.press(await screen.findByRole('button', { name: 'Continue' }));

    expect(await screen.findByText(/^confirm 2000000000 VND/)).toBeOnTheScreen();
  });
});

describe('a code that cannot be paid', () => {
  it('says why, offers a way out, and offers no way to pay', async () => {
    const user = userEvent.setup();
    await renderMerchantAmount(buildMerchantCode({ currencyNumeric: '834', country: 'TZ' }));

    expect(
      await screen.findByText('Payments to this code are not available yet'),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Close' }));

    expect(await screen.findByText('the scanner')).toBeOnTheScreen();
  });

  it('refuses a phone number handed to it as a merchant code', async () => {
    await renderMerchantAmount('+2250701234567');

    expect(await screen.findByRole('button', { name: 'Close' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeOnTheScreen();
  });
});
