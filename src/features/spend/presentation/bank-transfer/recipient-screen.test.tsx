import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { Text } from 'react-native';
import { ok } from '@/core/result/result';
import type { Wallet, WalletBalancePort } from '@/core/wallet/wallet';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { stubWindowLayout } from '@/test/stub-window-layout';
import { RecipientScreen } from './recipient-screen';
import type { BankTransferParamList } from './bank-transfer-param-list';

jest.useFakeTimers();

const Stack = createNativeStackNavigator<BankTransferParamList>();

type WithScanner = { Recipient: undefined; ScanToPay: { fundingToken?: string } | undefined };
const Root = createNativeStackNavigator<WithScanner>();

function ScanProbe({ route }: NativeStackScreenProps<WithScanner, 'ScanToPay'>) {
  return <Text>{`scanning to pay from ${route.params?.fundingToken ?? 'nothing'}`}</Text>;
}

function walletsHolding(balances: Wallet['balances']): WalletBalancePort {
  return {
    listWallets: () =>
      Promise.resolve(ok([{ id: 'sol-wallet', address: 'own', blockchain: 'SOL', balances }])),
  };
}

const USDT_ONLY = walletsHolding([
  { tokenId: 'usdt-sol', symbol: 'USDT', amount: '42.5', decimals: 6 },
]);

const handoffs: BankTransferParamList['Amount'][] = [];

function Probe() {
  handoffs.push(useRoute<RouteProp<BankTransferParamList, 'Amount'>>().params);

  return null;
}

let windowLayout: ReturnType<typeof stubWindowLayout>;

beforeEach(() => {
  handoffs.length = 0;
  windowLayout = stubWindowLayout({ x: 16, y: 136, width: 112, height: 44 });
});

afterEach(() => {
  windowLayout.mockRestore();
});

async function renderRecipient(
  params: BankTransferParamList['Recipient'],
  wallets?: WalletBalancePort,
  rememberedCurrency?: string,
) {
  await renderWithProviders(
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Recipient" component={RecipientScreen} initialParams={params} />
      <Stack.Screen name="Amount" component={Probe} />
    </Stack.Navigator>,
    {
      withNavigation: true,
      container: createTestContainer({
        ...(wallets === undefined ? {} : { walletBalancePort: asValue(wallets) }),
        lastTransferCurrencyRepository: asValue({
          read: () => rememberedCurrency,
          remember: () => undefined,
        }),
      }),
    },
  );
}

type User = ReturnType<typeof userEvent.setup>;

async function payEthanBrooks(user: User) {
  await user.press(await screen.findByRole('button', { name: 'Saved Beneficiaries' }));
  await user.press(await screen.findByRole('button', { name: /^Ethan Brooks,/ }));
  await user.press(await screen.findByRole('button', { name: 'Continue' }));
}

describe('starting on the last transfer currency', () => {
  it('starts on the currency of the last transfer', async () => {
    await renderRecipient(undefined, undefined, 'NGN');

    expect(await screen.findByRole('button', { name: 'Currency' })).toHaveAccessibilityValue({
      text: 'Nigerian Naira',
    });
    expect(await screen.findByLabelText('Account number')).toBeOnTheScreen();
  });

  it('asks for a currency before any transfer', async () => {
    await renderRecipient(undefined);

    expect(await screen.findByRole('button', { name: 'Currency' })).not.toHaveAccessibilityValue({
      text: 'Nigerian Naira',
    });
    expect(screen.queryByRole('button', { name: 'Payment method' })).not.toBeOnTheScreen();
  });

  it('starts on a saved beneficiary’s currency over the remembered one', async () => {
    await renderRecipient(
      { prefill: { currency: 'KES', values: { phoneNumber: '+254700000000' } } },
      undefined,
      'NGN',
    );

    expect(await screen.findByLabelText('Phone number')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Account number')).not.toBeOnTheScreen();
  });

  it('ignores a remembered currency that is no longer paid by form', async () => {
    await renderRecipient(undefined, undefined, 'VND');

    expect(await screen.findByRole('button', { name: 'Currency' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Payment method' })).not.toBeOnTheScreen();
    expect(screen.queryByLabelText('Account number')).not.toBeOnTheScreen();
  });

  it('hands the payment to the amount step as a transfer', async () => {
    const user = userEvent.setup();
    await renderRecipient(undefined);

    await payEthanBrooks(user);

    expect(handoffs.at(-1)?.origin).toBe('transfer');
  });

  it('hands a payment a scan started to the amount step as a scan', async () => {
    const user = userEvent.setup();
    await renderRecipient({ prefill: { currency: 'NGN', values: {}, origin: 'scan' } });

    await payEthanBrooks(user);

    expect(handoffs.at(-1)?.origin).toBe('scan');
  });
});

describe('choosing the wallet that pays', () => {
  it('reads the account’s wallets once, not once per token', async () => {
    const listWallets = jest.fn(
      walletsHolding([
        { tokenId: 'usdc-sol', symbol: 'USDC', amount: '5', decimals: 6 },
        { tokenId: 'usdt-sol', symbol: 'USDT', amount: '2', decimals: 6 },
      ]).listWallets,
    );
    await renderRecipient(undefined, { listWallets });

    await screen.findByRole('button', { name: 'Token, USDC' });

    expect(listWallets).toHaveBeenCalledTimes(1);
  });

  it('lists the wallets the account holds with their balances, starting on USDC', async () => {
    const user = userEvent.setup();
    await renderRecipient(undefined);

    await user.press(await screen.findByRole('button', { name: 'Token, USDC' }));

    expect(await screen.findByRole('button', { name: 'USDC, 5,136.98 USDC' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'USDT, 0.00 USDT' })).not.toBeSelected();
  });

  it('funds the payout from the wallet chosen in the menu', async () => {
    const user = userEvent.setup();
    await renderRecipient(undefined);

    await user.press(await screen.findByRole('button', { name: 'Token, USDC' }));
    await user.press(await screen.findByRole('button', { name: /^USDT/ }));
    await payEthanBrooks(user);

    expect(handoffs.at(-1)?.fundingToken).toBe('USDT');
  });

  it('funds the payout from USDT when that is the only wallet the account holds', async () => {
    const user = userEvent.setup();
    await renderRecipient(undefined, USDT_ONLY);

    await screen.findByRole('button', { name: 'Token, USDT' });
    await payEthanBrooks(user);

    expect(handoffs.at(-1)?.fundingToken).toBe('USDT');
  });

  it('keeps the wallet a scan arrived with', async () => {
    await renderRecipient({
      prefill: { currency: 'NGN', values: { accountNumber: '0123578038' }, fundingToken: 'USDT' },
    });

    expect(await screen.findByRole('button', { name: 'Token, USDT' })).toBeOnTheScreen();
  });

  it('cannot continue when the account holds no wallet to pay from', async () => {
    const user = userEvent.setup();
    await renderRecipient(undefined, walletsHolding([]));

    await user.press(await screen.findByRole('button', { name: 'Saved Beneficiaries' }));
    await user.press(await screen.findByRole('button', { name: /^Ethan Brooks,/ }));

    expect(await screen.findByDisplayValue('ethan.brooks@mail.com')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Token' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});

describe('scanning to pay', () => {
  it('opens scan to pay from the header, carrying the chosen wallet', async () => {
    const user = userEvent.setup();
    await renderWithProviders(
      <Root.Navigator screenOptions={{ headerShown: false }}>
        <Root.Screen name="Recipient" component={RecipientScreen} />
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

describe('arriving with nothing', () => {
  it('asks for a currency before anything else', async () => {
    await renderRecipient(undefined);

    expect(await screen.findByRole('button', { name: 'Currency' })).toBeOnTheScreen();
  });
});

describe('arriving from a scan', () => {
  it('opens on the currency the scan resolved', async () => {
    await renderRecipient({
      prefill: { currency: 'NGN', values: { accountNumber: '0123578038' } },
    });

    expect(await screen.findByText('Nigerian Naira')).toBeOnTheScreen();
  });

  it('fills in the account number that was scanned', async () => {
    await renderRecipient({
      prefill: { currency: 'NGN', values: { accountNumber: '0123578038' } },
    });

    expect(await screen.findByDisplayValue('0123578038')).toBeOnTheScreen();
  });

  it('still asks for the bank the number belongs to', async () => {
    await renderRecipient({
      prefill: { currency: 'NGN', values: { accountNumber: '0123578038' } },
    });

    expect(await screen.findByRole('button', { name: /Continue/i })).toBeDisabled();
  });

  it('fills in a scanned mobile-money number', async () => {
    await renderRecipient({
      prefill: { currency: 'XOF', values: { phoneNumber: '+2250701234567' } },
    });

    expect(await screen.findByDisplayValue('+2250701234567')).toBeOnTheScreen();
  });
});

describe('paying a saved beneficiary', () => {
  async function openSaved(user: User) {
    await user.press(await screen.findByRole('button', { name: 'Saved Beneficiaries' }));
  }

  it('offers only the saved beneficiaries a form can pay', async () => {
    const user = userEvent.setup();
    await renderRecipient(undefined);

    await openSaved(user);

    expect(await screen.findByRole('button', { name: /^Jasper Nwosu,/ })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^Ethan Brooks,/ })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Lena Fischer,/ })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /BDO Unibank/ })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Main wallet,/ })).not.toBeOnTheScreen();
  });

  it('pays exactly the saved destination', async () => {
    const user = userEvent.setup();
    await renderRecipient(undefined);

    await openSaved(user);
    await user.press(await screen.findByRole('button', { name: /^Ethan Brooks,/ }));
    await user.press(await screen.findByRole('button', { name: 'Continue' }));

    expect(handoffs.at(-1)?.recipient).toMatchObject({
      currency: 'USD',
      rail: 'zelle_transfer',
      endpoint: '/transaction/wallet-to-bank',
      values: {
        category: 'individual',
        beneficiaryName: 'Ethan Brooks',
        zelleId: 'ethan.brooks@mail.com',
      },
    });
    expect(handoffs.at(-1)?.fundingToken).toBe('USDC');
  });

  it('fills the form from a quick-send face', async () => {
    const user = userEvent.setup();
    await renderRecipient(undefined);

    await openSaved(user);
    await user.press(await screen.findByRole('button', { name: 'Ethan Brooks' }));

    expect(await screen.findByDisplayValue('ethan.brooks@mail.com')).toBeOnTheScreen();
  });

  it('resolves a saved Nigerian account again before paying it', async () => {
    const user = userEvent.setup();
    await renderRecipient(undefined);

    await openSaved(user);
    await user.press(await screen.findByRole('button', { name: /^Jasper Nwosu,/ }));

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    expect(await screen.findByDisplayValue('Jasper Nwosu')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(handoffs.at(-1)?.recipient).toMatchObject({
      currency: 'NGN',
      rail: 'bank_transfer',
      values: { bankCode: '058', accountNumber: '0152847803', accountName: 'Jasper Nwosu' },
    });
  });
});
