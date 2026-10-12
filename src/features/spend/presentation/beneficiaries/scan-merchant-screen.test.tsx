import { useEffect } from 'react';
import { NavigationContainer, useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { act, screen } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { Text } from '@/shared/ui';
import { buildMerchantCode } from '@/test/qr-payloads';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type {
  CameraPermission,
  CameraScannerPort,
  ScannerViewProps,
} from '../../domain/port/camera-scanner-port';
import { ScanMerchantScreen } from './scan-merchant-screen';
import type { BeneficiariesParamList } from './beneficiaries-param-list';

jest.useFakeTimers();

const Stack = createNativeStackNavigator<BeneficiariesParamList>();

const opened: { route: string; params: unknown }[] = [];

function Probe() {
  const route = useRoute();

  useEffect(() => {
    opened.push({ route: route.name, params: route.params });
  }, [route]);

  return <Text accessibilityRole="header">{route.name}</Text>;
}

let report: ((raw: string) => void) | undefined;

function FakeCamera({ active, onCodeScanned, onReady }: ScannerViewProps) {
  useEffect(() => {
    report = onCodeScanned;
  }, [onCodeScanned]);

  useEffect(() => {
    if (active) onReady();
  }, [active, onReady]);

  return null;
}

function scannerPort(permission: CameraPermission): CameraScannerPort {
  return {
    getPermission: () => Promise.resolve(permission),
    requestPermission: () => Promise.resolve('granted'),
  };
}

async function renderScanner(permission: CameraPermission = 'granted') {
  opened.length = 0;
  report = undefined;

  await renderWithProviders(
    <NavigationContainer
      initialState={{
        index: 2,
        routes: [{ name: 'List' }, { name: 'AddBank' }, { name: 'ScanMerchant' }],
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="List" component={Probe} />
        <Stack.Screen name="AddBank" component={Probe} />
        <Stack.Screen name="ScanMerchant" component={ScanMerchantScreen} />
        <Stack.Screen name="AddMerchant" component={Probe} />
      </Stack.Navigator>
    </NavigationContainer>,
    {
      container: createTestContainer({
        cameraScannerPort: asValue(scannerPort(permission)),
        cameraScannerView: asValue(FakeCamera),
      }),
    },
  );

  await act(async () => {
    await jest.advanceTimersByTimeAsync(0);
  });
}

async function scan(raw: string) {
  await act(async () => {
    report?.(raw);
    await jest.advanceTimersByTimeAsync(0);
  });
}

describe('scanning a merchant to save', () => {
  it('opens the preview with a reusable sticker, character for character', async () => {
    const sticker = buildMerchantCode({ merchantName: 'PHO 24' });
    await renderScanner();

    await scan(sticker);

    expect(await screen.findByRole('header', { name: 'AddMerchant' })).toBeOnTheScreen();
    expect(opened.at(-1)).toEqual({ route: 'AddMerchant', params: { qrString: sticker } });
  });

  it('refuses a code made for a single payment, and keeps looking', async () => {
    await renderScanner();

    await scan(buildMerchantCode({ amount: '45000', initiation: '12' }));

    expect(
      screen.getByText('This code is for a single payment, so it can’t be saved'),
    ).toBeOnTheScreen();
    expect(opened.map((entry) => entry.route)).not.toContain('AddMerchant');
  });

  it('opens the preview for a code in any currency', async () => {
    const peso = buildMerchantCode({ currencyNumeric: '608', country: 'PH' });
    await renderScanner();

    await scan(peso);

    expect(await screen.findByRole('header', { name: 'AddMerchant' })).toBeOnTheScreen();
    expect(opened.at(-1)).toEqual({ route: 'AddMerchant', params: { qrString: peso } });
  });

  it('refuses a wallet address', async () => {
    await renderScanner();

    await scan('0xb249111111111111111111111111111111113901');

    expect(screen.getByText('This code is not supported yet')).toBeOnTheScreen();
  });

  it('says what the camera is for before asking for it', async () => {
    await renderScanner('undetermined');

    expect(
      await screen.findByText('We need your camera to read a merchant’s QR code.'),
    ).toBeOnTheScreen();
  });
});
