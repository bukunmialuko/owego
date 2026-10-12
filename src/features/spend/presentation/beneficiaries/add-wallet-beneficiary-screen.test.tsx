import { NavigationContainer, useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { act, screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { Text } from '@/shared/ui';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { createPreviewBeneficiaryRepository } from '../../data/repository/preview-beneficiary-repository';
import type { RecipientFields } from '../../domain/entity/beneficiary';
import type { BeneficiaryRepository } from '../../domain/repository/beneficiary-repository';
import { AddWalletBeneficiaryScreen } from './add-wallet-beneficiary-screen';
import type { BeneficiariesParamList } from './beneficiaries-param-list';

jest.useFakeTimers();

const SOLANA_ADDRESS = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin';
const EVM_ADDRESS = '0x5a4c44444444444444444444444444444444e4a9';

const Stack = createNativeStackNavigator<BeneficiariesParamList>();

const opened: { route: string; params: unknown }[] = [];

function Probe() {
  const route = useRoute();
  opened.push({ route: route.name, params: route.params });

  return <Text accessibilityRole="header">{route.name}</Text>;
}

beforeEach(() => {
  opened.length = 0;
});

function renderAdd(
  params?: BeneficiariesParamList['AddWallet'],
  repository: BeneficiaryRepository = createPreviewBeneficiaryRepository(),
) {
  return renderWithProviders(
    <NavigationContainer
      initialState={{ index: 1, routes: [{ name: 'List' }, { name: 'AddWallet', params }] }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="List" component={Probe} />
        <Stack.Screen name="AddWallet" component={AddWalletBeneficiaryScreen} />
        <Stack.Screen name="ScanAddress" component={Probe} />
      </Stack.Navigator>
    </NavigationContainer>,
    { container: createTestContainer({ beneficiaryRepository: asValue(repository) }) },
  );
}

type User = ReturnType<typeof userEvent.setup>;

async function chooseNetwork(user: User, name: string) {
  await user.press(await screen.findByRole('button', { name: 'Network' }));
  await user.press(await screen.findByRole('button', { name }));
}

describe('adding a wallet address', () => {
  it('asks for a tag, a network and an address', async () => {
    await renderAdd();

    expect(await screen.findByRole('header', { name: 'Add Beneficiary' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Wallet tag')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Network' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Wallet address')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Save address' })).toBeDisabled();
  });

  it('shows what a tag is with an example name', async () => {
    await renderAdd();

    expect(await screen.findByPlaceholderText('e.g. John’s wallet')).toBeOnTheScreen();
  });

  it('saves the wallet and returns to the wallet tab', async () => {
    const user = userEvent.setup();
    const created: RecipientFields[] = [];
    const preview = createPreviewBeneficiaryRepository();
    await renderAdd(undefined, {
      ...preview,
      create: (fields) => {
        created.push(fields);

        return preview.create(fields);
      },
    });

    await user.type(await screen.findByLabelText('Wallet tag'), 'Savings');
    await chooseNetwork(user, 'Base');
    await user.type(screen.getByLabelText('Wallet address'), EVM_ADDRESS);
    await user.press(screen.getByRole('button', { name: 'Save address' }));

    expect(await screen.findByRole('header', { name: 'List' })).toBeOnTheScreen();
    expect(opened.at(-1)).toEqual({ route: 'List', params: { tab: 'wallet' } });
    expect(created).toEqual([
      expect.objectContaining({
        bankCountry: '',
        bankName: 'BASE',
        accountHolder: 'Savings',
        accountNumber: EVM_ADDRESS,
        paymentMethod: '',
      }),
    ]);
  });

  it('refuses an address that belongs to another network, and says which', async () => {
    const user = userEvent.setup();
    await renderAdd();

    await user.type(await screen.findByLabelText('Wallet tag'), 'Savings');
    await chooseNetwork(user, 'Solana');
    await user.type(screen.getByLabelText('Wallet address'), EVM_ADDRESS);

    expect(
      await screen.findByRole('alert', { name: /does not look like a Solana address/ }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Save address' })).toBeDisabled();
  });

  it('names a wallet already saved rather than saving it twice', async () => {
    const user = userEvent.setup();
    await renderAdd();

    await user.type(await screen.findByLabelText('Wallet tag'), 'Again');
    await chooseNetwork(user, 'Base');
    await user.type(
      screen.getByLabelText('Wallet address'),
      '0xb249111111111111111111111111111111113901',
    );
    await user.press(screen.getByRole('button', { name: 'Save address' }));

    expect(
      await screen.findByText('Business wallet is already saved with these details.'),
    ).toBeOnTheScreen();
  });
});

describe('scanning an address in', () => {
  it('opens the scanner', async () => {
    const user = userEvent.setup();
    await renderAdd();

    await user.press(await screen.findByRole('button', { name: 'Scan a wallet address' }));

    expect(await screen.findByRole('header', { name: 'ScanAddress' })).toBeOnTheScreen();
  });

  it('fills in the address the scanner read, and the network it named', async () => {
    await renderAdd({ scanned: { address: SOLANA_ADDRESS, networkCode: 'SOL', nonce: 1 } });

    expect(await screen.findByDisplayValue(SOLANA_ADDRESS)).toBeOnTheScreen();
    expect(await screen.findByText('Solana')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Network' })).toHaveAccessibilityValue({
      text: 'Solana',
    });
  });

  it('leaves the network to be chosen when the scan could not name it', async () => {
    await renderAdd({ scanned: { address: EVM_ADDRESS, nonce: 1 } });

    expect(await screen.findByDisplayValue(EVM_ADDRESS)).toBeOnTheScreen();
    await act(async () => {
      await jest.runAllTimersAsync();
    });
    for (const network of ['Solana', 'Base', 'Monad', 'Arc']) {
      expect(screen.queryByText(network)).not.toBeOnTheScreen();
    }
  });
});
