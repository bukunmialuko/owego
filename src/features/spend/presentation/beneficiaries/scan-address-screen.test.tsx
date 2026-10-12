import { useEffect } from 'react';
import { NavigationContainer, useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { act, screen } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { Text } from '@/shared/ui';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type {
  CameraPermission,
  CameraScannerPort,
  ScannerViewProps,
} from '../../domain/port/camera-scanner-port';
import { ScanAddressScreen } from './scan-address-screen';
import type { BeneficiariesParamList } from './beneficiaries-param-list';

jest.useFakeTimers();

const SOLANA_ADDRESS = 'Cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx4';
const EVM_ADDRESS = '0xb249111111111111111111111111111111113901';

const Stack = createNativeStackNavigator<BeneficiariesParamList>();

const handedBack: unknown[] = [];

function FormProbe() {
  const params = useRoute().params;

  useEffect(() => {
    if (params !== undefined) handedBack.push(params);
  }, [params]);

  return <Text accessibilityRole="header">AddWallet</Text>;
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
  handedBack.length = 0;
  report = undefined;

  await renderWithProviders(
    <NavigationContainer
      initialState={{
        index: 2,
        routes: [{ name: 'List' }, { name: 'AddWallet' }, { name: 'ScanAddress' }],
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="List" component={FormProbe} />
        <Stack.Screen name="AddWallet" component={FormProbe} />
        <Stack.Screen name="ScanAddress" component={ScanAddressScreen} />
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

describe('scanning a wallet address', () => {
  it('hands a Solana address back to the form, with the network its link named', async () => {
    await renderScanner();

    await scan(`solana:${SOLANA_ADDRESS}`);

    expect(await screen.findByRole('header', { name: 'AddWallet' })).toBeOnTheScreen();
    expect(handedBack.at(-1)).toEqual({
      scanned: { address: SOLANA_ADDRESS, networkCode: 'SOL', nonce: expect.any(Number) },
    });
  });

  it('hands back a bare address without naming a network', async () => {
    await renderScanner();

    await scan(EVM_ADDRESS);

    expect(await screen.findByRole('header', { name: 'AddWallet' })).toBeOnTheScreen();
    expect(handedBack.at(-1)).toEqual({
      scanned: { address: EVM_ADDRESS, nonce: expect.any(Number) },
    });
  });

  it('says a chain owego cannot send to is not supported, and keeps looking', async () => {
    await renderScanner();

    await scan('bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');

    expect(await screen.findByText('This code is not supported yet')).toBeOnTheScreen();
    expect(handedBack).toEqual([]);
  });

  it('explains what the camera is for before asking for it', async () => {
    await renderScanner('undetermined');

    expect(
      await screen.findByText('We need your camera to read a wallet address from its QR code.'),
    ).toBeOnTheScreen();
  });
});
