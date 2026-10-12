import { useEffect } from 'react';
import { Text } from 'react-native';
import { NavigationContainer, useNavigation, useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { act, screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { darkTheme } from '@/core/design-system';
import { unknownError } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { buildMerchantCode } from '@/test/qr-payloads';
import type {
  CameraPermission,
  CameraScannerPort,
  ScannerViewProps,
} from '../../domain/port/camera-scanner-port';
import type { Wallet, WalletBalancePort } from '@/core/wallet/wallet';
import type { AccountCaptureRepository } from '../../domain/repository/account-capture-repository';
import { ScanToPayScreen } from './scan-to-pay-screen';

jest.useFakeTimers();

const SOLANA = 'Cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx4';

function walletsHolding(balances: Wallet['balances']): WalletBalancePort {
  return {
    listWallets: () =>
      Promise.resolve(ok([{ id: 'sol-wallet', address: 'own', blockchain: 'SOL', balances }])),
  };
}

const USDC_ONLY = walletsHolding([
  { tokenId: 'usdc-sol', symbol: 'USDC', amount: '10', decimals: 6 },
]);
const USDT_ONLY = walletsHolding([
  { tokenId: 'usdt-sol', symbol: 'USDT', amount: '42.5', decimals: 6 },
]);

let handedOver: { route: string; params: unknown } | undefined;
let handoffs = 0;

function probe(route: string) {
  return function Probe() {
    const params = useRoute().params;
    const navigation = useNavigation();

    useEffect(() => {
      handedOver = { route, params };
      handoffs += 1;
    }, [params]);

    return (
      <Text
        accessibilityRole="button"
        onPress={() => {
          navigation.goBack();
        }}
      >
        {`Back from ${route}`}
      </Text>
    );
  };
}

const Stack = createNativeStackNavigator();

let report: ((raw: string) => void) | undefined;

let shutterFails = false;

function FakeCamera({ active, onCodeScanned, onReady, handleRef }: ScannerViewProps) {
  useEffect(() => {
    report = onCodeScanned;
  }, [onCodeScanned]);

  useEffect(() => {
    if (!active || handleRef === undefined) return;

    handleRef.current = {
      capture: () =>
        Promise.resolve(
          shutterFails
            ? err(unknownError('The camera could not take a photograph.'))
            : ok({ uri: 'file:///cache/capture.jpg', width: 1, height: 1, mimeType: 'image/jpeg' }),
        ),
    };
  }, [active, handleRef]);

  useEffect(() => {
    if (active) onReady();
  }, [active, onReady]);

  return null;
}

function scannerPort(permission: CameraPermission = 'granted'): CameraScannerPort {
  return {
    getPermission: () => Promise.resolve(permission),
    requestPermission: () => Promise.resolve('granted'),
  };
}

async function settlePromises() {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(0);
  });
}

async function renderScanner({
  permission = 'granted',
  accountCapture,
  fundingToken,
  wallets,
}: {
  permission?: CameraPermission;
  accountCapture?: AccountCaptureRepository;
  fundingToken?: string;
  wallets?: WalletBalancePort;
} = {}) {
  handedOver = undefined;
  handoffs = 0;
  shutterFails = false;
  report = undefined;

  await renderWithProviders(
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="ScanToPay"
        component={ScanToPayScreen}
        initialParams={fundingToken === undefined ? undefined : { fundingToken }}
      />
      <Stack.Screen name="BankTransfer" component={probe('BankTransfer')} />
      <Stack.Screen name="SendAsset" component={probe('SendAsset')} />
    </Stack.Navigator>,
    {
      withNavigation: true,
      container: createTestContainer({
        cameraScannerPort: asValue(scannerPort(permission)),
        cameraScannerView: asValue(FakeCamera),
        ...(accountCapture === undefined
          ? {}
          : { accountCaptureRepository: asValue(accountCapture) }),
        ...(wallets === undefined ? {} : { walletBalancePort: asValue(wallets) }),
      }),
    },
  );

  await jest.runOnlyPendingTimersAsync();
  await settlePromises();
}

function BehindTheScanner() {
  return <Text>the screen the scanner was opened from</Text>;
}

async function renderScannerOverApp() {
  await renderWithProviders(
    <NavigationContainer
      initialState={{ index: 1, routes: [{ name: 'Behind' }, { name: 'ScanToPay' }] }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Behind" component={BehindTheScanner} />
        <Stack.Screen name="ScanToPay" component={ScanToPayScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
    {
      container: createTestContainer({
        cameraScannerPort: asValue(scannerPort()),
        cameraScannerView: asValue(FakeCamera),
      }),
    },
  );

  await jest.runOnlyPendingTimersAsync();
  await settlePromises();
}

async function scan(raw: string) {
  await act(async () => {
    report?.(raw);
    await jest.runOnlyPendingTimersAsync();
  });
}

describe('the header', () => {
  it('steps back to wherever the scanner was opened from', async () => {
    await renderScannerOverApp();

    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .press(await screen.findByRole('button', { name: 'Back' }));
    await jest.runOnlyPendingTimersAsync();

    expect(await screen.findByText('the screen the scanner was opened from')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Capture account details' })).not.toBeOnTheScreen();
  });

  it('draws its controls from the dark palette even when the app is light', async () => {
    await renderScanner();

    expect(await screen.findByRole('button', { name: 'Back' })).toHaveStyle({
      backgroundColor: darkTheme.color.fillNeutral,
    });
    expect(screen.getByRole('button', { name: 'Turn flash on' })).toHaveStyle({
      backgroundColor: darkTheme.color.fillNeutral,
    });
  });
});

describe('scanning a merchant code', () => {
  it('opens the merchant amount page with the code, character for character, and nothing else', async () => {
    const raw = buildMerchantCode({ amount: '100000' });
    await renderScanner();
    await scan(raw);

    expect(handedOver).toEqual({
      route: 'BankTransfer',
      params: { screen: 'MerchantAmount', params: { qrString: raw, fundingToken: 'USDC' } },
    });
  });

  it('never stops to confirm the merchant first', async () => {
    await renderScanner();
    await scan(buildMerchantCode({ amount: '100000' }));

    expect(screen.queryByText('Confirm recipient')).not.toBeOnTheScreen();
    expect(handedOver).toMatchObject({ params: { screen: 'MerchantAmount' } });
  });

  it('opens the same page for a sticker that leaves the amount to the payer', async () => {
    const raw = buildMerchantCode();
    await renderScanner();
    await scan(raw);

    expect(handedOver).toMatchObject({
      route: 'BankTransfer',
      params: { screen: 'MerchantAmount', params: { qrString: raw } },
    });
  });

  it('opens it once, however many frames the code is read in', async () => {
    const raw = buildMerchantCode({ amount: '100000' });
    await renderScanner();
    await scan(raw);
    await scan(raw);
    await scan(raw);

    expect(handoffs).toBe(1);
  });
});

describe('the wallet a scan pays from', () => {
  async function continueWithMerchant() {
    await scan(buildMerchantCode({ amount: '100000' }));
  }

  it('is the one chosen on the send form the scanner was opened from', async () => {
    await renderScanner({ fundingToken: 'USDT' });
    await continueWithMerchant();

    expect(handedOver).toMatchObject({ params: { params: { fundingToken: 'USDT' } } });
  });

  it('is USDT when that is the only wallet the account holds', async () => {
    await renderScanner({ wallets: USDT_ONLY });
    await continueWithMerchant();

    expect(handedOver).toMatchObject({ params: { params: { fundingToken: 'USDT' } } });
  });

  it('falls back to a held wallet when the one chosen is no longer held', async () => {
    await renderScanner({ fundingToken: 'USDT', wallets: USDC_ONLY });
    await continueWithMerchant();

    expect(handedOver).toMatchObject({ params: { params: { fundingToken: 'USDC' } } });
  });

  it('travels with a scanned address to the send form', async () => {
    await renderScanner({ fundingToken: 'USDT' });
    await scan(`solana:${SOLANA}`);

    expect(handedOver).toMatchObject({
      route: 'SendAsset',
      params: { params: { prefill: { tokenSymbol: 'USDT' } } },
    });
  });
});

describe('scanning something that is not a merchant code', () => {
  it('opens the send screen for a wallet address, on the network it names', async () => {
    await renderScanner();
    await scan(`solana:${SOLANA}`);

    expect(handedOver).toEqual({
      route: 'SendAsset',
      params: {
        screen: 'Recipient',
        params: { prefill: { address: SOLANA, networkCode: 'SOL', tokenSymbol: 'USDC' } },
      },
    });
  });

  it('opens the recipient form for a mobile-money number', async () => {
    await renderScanner();
    await scan('+2250701234567');

    expect(handedOver).toEqual({
      route: 'BankTransfer',
      params: {
        screen: 'Recipient',
        params: {
          prefill: {
            currency: 'XOF',
            values: { phoneNumber: '+2250701234567' },
            fundingToken: 'USDC',
            origin: 'scan',
          },
        },
      },
    });
  });

  it('opens it once, however many frames the code is read in', async () => {
    await renderScanner();
    await scan(`solana:${SOLANA}`);
    await scan(`solana:${SOLANA}`);
    await scan(`solana:${SOLANA}`);

    expect(handoffs).toBe(1);
  });

  it('opens the recipient form for a ten-digit account number', async () => {
    await renderScanner();
    await scan('0123456789');

    expect(handedOver).toMatchObject({
      route: 'BankTransfer',
      params: {
        screen: 'Recipient',
        params: { prefill: { currency: 'NGN', values: { accountNumber: '0123456789' } } },
      },
    });
  });
});

describe('scanning something it cannot pay', () => {
  it('says so and stays where it is', async () => {
    await renderScanner();
    await scan('thanks for your custom');

    expect(await screen.findByText('This code is not supported yet')).toBeOnTheScreen();
    expect(handedOver).toBeUndefined();
  });

  it('pays a Thai merchant now that baht is open', async () => {
    const raw = buildMerchantCode({ amount: '100', currencyNumeric: '764', country: 'TH' });
    await renderScanner();
    await scan(raw);

    expect(screen.queryByText(/coming soon/)).not.toBeOnTheScreen();
    expect(handedOver).toMatchObject({
      route: 'BankTransfer',
      params: { screen: 'MerchantAmount', params: { qrString: raw } },
    });
  });
});

describe('the camera permission', () => {
  it('explains what the camera is for before asking for it', async () => {
    await renderScanner({ permission: 'undetermined' });

    expect(await screen.findByText('Camera access required')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Allow camera' })).toBeOnTheScreen();
  });

  it('sends a blocked payer to Settings rather than offering a button that does nothing', async () => {
    await renderScanner({ permission: 'blocked' });

    expect(await screen.findByRole('button', { name: 'Open Settings' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Allow camera' })).toBeNull();
  });
});

describe('capturing an account from a photograph', () => {
  const capture: AccountCaptureRepository = {
    readAccount: () =>
      Promise.resolve(
        ok({
          accountNumber: '0123578038',
          bankCode: '058',
          bankName: 'Guaranty Trust Bank',
          accountName: 'Precious Jameson',
          isVerified: true,
        }),
      ),
  };

  it('confirms the account the server read', async () => {
    await renderScanner({ accountCapture: capture });

    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .press(await screen.findByRole('button', { name: 'Capture account details' }));
    await jest.runOnlyPendingTimersAsync();

    expect(await screen.findByText('Precious Jameson')).toBeOnTheScreen();
    expect(screen.getByText('Guaranty Trust Bank')).toBeOnTheScreen();
    expect(screen.getByText('0123578038')).toBeOnTheScreen();
  });

  it('says a photograph it could not take was not taken', async () => {
    await renderScanner({ accountCapture: capture });
    shutterFails = true;

    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .press(await screen.findByRole('button', { name: 'Capture account details' }));
    await settlePromises();

    expect(screen.getByText('The photo could not be taken. Please try again.')).toBeOnTheScreen();
  });

  it('says a photograph it could not read was not read, and keeps scanning', async () => {
    await renderScanner({ accountCapture: { readAccount: () => Promise.resolve(ok(undefined)) } });

    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .press(await screen.findByRole('button', { name: 'Capture account details' }));
    await settlePromises();

    expect(
      screen.getByText('Could not read bank or account details. Please try again.'),
    ).toBeOnTheScreen();
    expect(handedOver).toBeUndefined();
  });
});
