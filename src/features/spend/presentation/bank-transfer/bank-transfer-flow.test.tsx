import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { Text } from 'react-native';
import { offline } from '@/core/errors/app-error';
import { err } from '@/core/result/result';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { createPreviewCorridorLookupRepository } from '../../data/repository/preview-corridor-lookup-repository';
import type { CorridorLookupRepository } from '../../domain/repository/corridor-lookup-repository';
import { BankTransferNavigator } from './bank-transfer-navigator';

jest.useFakeTimers();

function renderFlow(corridorLookupRepository?: CorridorLookupRepository) {
  return renderWithProviders(<BankTransferNavigator />, {
    withNavigation: true,
    container: createTestContainer(
      corridorLookupRepository === undefined
        ? {}
        : { corridorLookupRepository: asValue(corridorLookupRepository) },
    ),
  });
}

type AppStack = { BankTransfer: undefined; ScanToPay: { fundingToken?: string } | undefined };

const Root = createNativeStackNavigator<AppStack>();

function ScanToPayStub({ route }: NativeStackScreenProps<AppStack, 'ScanToPay'>) {
  return <Text>{`scan to pay from ${route.params?.fundingToken ?? 'no wallet'}`}</Text>;
}

function renderFlowInApp() {
  return renderWithProviders(
    <Root.Navigator screenOptions={{ headerShown: false }}>
      <Root.Screen name="BankTransfer" component={BankTransferNavigator} />
      <Root.Screen name="ScanToPay" component={ScanToPayStub} />
    </Root.Navigator>,
    { withNavigation: true, container: createTestContainer() },
  );
}

type User = ReturnType<typeof userEvent.setup>;

async function chooseCurrency(user: User, name: string) {
  await user.press(await screen.findByRole('button', { name: 'Currency' }));
  await user.press(await screen.findByRole('button', { name }));
}

async function chooseMethod(user: User, name: string) {
  await user.press(await screen.findByRole('button', { name: 'Payment method' }));
  await user.press(await screen.findByRole('button', { name }));
}

describe('choosing a corridor', () => {
  it('asks for a currency before anything else', async () => {
    await renderFlow();

    expect(await screen.findByRole('button', { name: 'Currency' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Payment method' })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('offers the dollar its three methods', async () => {
    const user = userEvent.setup();
    await renderFlow();

    await chooseCurrency(user, 'United States Dollar, USD');
    await user.press(await screen.findByRole('button', { name: 'Payment method' }));

    expect(await screen.findByRole('button', { name: /^Zelle/ })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^ACH/ })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^SWIFT/ })).toBeOnTheScreen();
  });

  it('disables the methods the backend cannot execute', async () => {
    const user = userEvent.setup();
    await renderFlow();

    await chooseCurrency(user, 'United States Dollar, USD');
    await user.press(await screen.findByRole('button', { name: 'Payment method' }));

    expect(await screen.findByRole('button', { name: 'ACH, Coming soon' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'SWIFT, Coming soon' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Zelle' })).toBeEnabled();
  });

  it.each(['Vietnamese Dong', 'Thai Baht'])(
    'opens Scan to pay for %s, from the chosen wallet',
    async (name) => {
      const user = userEvent.setup();
      await renderFlowInApp();

      await user.press(await screen.findByRole('button', { name: 'Currency' }));
      await user.press(await screen.findByRole('button', { name: new RegExp(`^${name}`) }));

      expect(await screen.findByText('scan to pay from USDC')).toBeOnTheScreen();
    },
  );
});

describe('picking a method', () => {
  it.each([
    ['Nigerian Naira, NGN', 'Bank transfer', 'Account number'],
    ['Kenyan Shilling, KES', 'Mobile money', 'Phone number'],
    ['West African Franc, XOF', 'Mobile money', 'Phone number'],
  ])(
    'fills the only method for %s and shows its form straight away',
    async (currency, method, field) => {
      const user = userEvent.setup();
      await renderFlow();

      await chooseCurrency(user, currency);

      expect(await screen.findByLabelText(field)).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Payment method' })).toHaveAccessibilityValue({
        text: method,
      });
    },
  );

  it('still asks where a currency offers more than one', async () => {
    const user = userEvent.setup();
    await renderFlow();

    await chooseCurrency(user, 'United States Dollar, USD');

    expect(await screen.findByRole('button', { name: 'Payment method' })).toBeOnTheScreen();
    expect(screen.queryByLabelText('Zelle ID')).not.toBeOnTheScreen();
  });

  it('drops the method again when the currency changes', async () => {
    const user = userEvent.setup();
    await renderFlow();

    await chooseCurrency(user, 'Nigerian Naira, NGN');
    expect(await screen.findByLabelText('Account number')).toBeOnTheScreen();

    await chooseCurrency(user, 'United States Dollar, USD');

    expect(screen.queryByLabelText('Account number')).not.toBeOnTheScreen();
  });
});

describe('the form changes shape with the corridor', () => {
  it('asks Zelle for an ID and a category', async () => {
    const user = userEvent.setup();
    await renderFlow();

    await chooseCurrency(user, 'United States Dollar, USD');
    await chooseMethod(user, 'Zelle');

    expect(await screen.findByLabelText('Zelle ID')).toBeOnTheScreen();
    expect(screen.getByLabelText('Beneficiary category')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Routing number')).not.toBeOnTheScreen();
  });

  it('asks Nigeria for a bank and an account number instead', async () => {
    const user = userEvent.setup();
    await renderFlow();

    await chooseCurrency(user, 'Nigerian Naira, NGN');
    await chooseMethod(user, 'Bank transfer');

    expect(await screen.findByLabelText('Bank name')).toBeOnTheScreen();
    expect(screen.getByLabelText('Account number')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Zelle ID')).not.toBeOnTheScreen();
  });

  it('asks Kenya for a provider and a phone number', async () => {
    const user = userEvent.setup();
    await renderFlow();

    await chooseCurrency(user, 'Kenyan Shilling, KES');
    await chooseMethod(user, 'Mobile money');

    expect(await screen.findByLabelText('Mobile money provider')).toBeOnTheScreen();
    expect(screen.getByLabelText('Phone number')).toBeOnTheScreen();
  });
});

describe('Nigeria resolves the account holder', () => {
  async function reachNigerianForm(user: User) {
    await chooseCurrency(user, 'Nigerian Naira, NGN');
    await chooseMethod(user, 'Bank transfer');
    await user.press(await screen.findByRole('button', { name: 'Bank name' }));
    await user.press(await screen.findByRole('button', { name: 'Guaranty Trust Bank' }));
  }

  it('says nothing until the number is complete', async () => {
    const user = userEvent.setup();
    await renderFlow();
    await reachNigerianForm(user);

    await user.type(await screen.findByLabelText('Account number'), '012345678');

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    expect(screen.queryByDisplayValue('Hannah Nuggest')).not.toBeOnTheScreen();
  });

  it('shows the name once the tenth digit lands, and only then allows Continue', async () => {
    const user = userEvent.setup();
    await renderFlow();
    await reachNigerianForm(user);

    await user.type(await screen.findByLabelText('Account number'), '0123456789');

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();

    expect(await screen.findByDisplayValue('Hannah Nuggest')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('drops the name again the moment the number is edited', async () => {
    const user = userEvent.setup();
    await renderFlow();
    await reachNigerianForm(user);

    const field = await screen.findByLabelText('Account number');
    await user.type(field, '0123456789');
    expect(await screen.findByDisplayValue('Hannah Nuggest')).toBeOnTheScreen();

    await user.type(field, '9');

    expect(screen.queryByDisplayValue('Hannah Nuggest')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('says so when an account cannot be verified rather than failing silently', async () => {
    const user = userEvent.setup();
    await renderFlow();
    await reachNigerianForm(user);

    await user.type(await screen.findByLabelText('Account number'), '9999999999');

    expect(
      await screen.findByRole('alert', { name: /couldn't verify that account/ }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('says the check could not be made when the lookup fails, and runs it again on retry', async () => {
    const user = userEvent.setup();
    const preview = createPreviewCorridorLookupRepository();
    let attempts = 0;
    await renderFlow({
      ...preview,
      resolveAccount: (bankCode, accountNumber) => {
        attempts += 1;

        return attempts === 1
          ? Promise.resolve(err(offline()))
          : preview.resolveAccount(bankCode, accountNumber);
      },
    });
    await reachNigerianForm(user);

    await user.type(await screen.findByLabelText('Account number'), '0123456789');

    expect(
      await screen.findByRole('alert', { name: /couldn't check that account/ }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole('alert', { name: /couldn't verify that account/ }),
    ).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();

    await user.press(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByDisplayValue('Hannah Nuggest')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });
});

describe('corridors the screens never heard of', () => {
  it('hides narration for the corridor whose wire body has nowhere to put one', async () => {
    const user = userEvent.setup();
    await renderFlow();

    await chooseCurrency(user, 'West African Franc, XOF');
    await chooseMethod(user, 'Mobile money');
    await user.press(await screen.findByRole('button', { name: 'Mobile money provider' }));
    await user.press(await screen.findByRole('button', { name: 'Wave' }));
    await user.type(await screen.findByLabelText('Recipient name'), 'Awa Diallo');
    await user.type(await screen.findByLabelText('Phone number'), '+2250700000000');
    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByLabelText(/To, Awa Diallo, Wave/)).toBeOnTheScreen();
    expect(screen.queryByLabelText('Transaction narration')).not.toBeOnTheScreen();
  });

  it('offers each mobile-money corridor its own providers', async () => {
    const user = userEvent.setup();
    await renderFlow();

    await chooseCurrency(user, 'West African Franc, XOF');
    await chooseMethod(user, 'Mobile money');
    await user.press(await screen.findByRole('button', { name: 'Mobile money provider' }));

    expect(await screen.findByRole('button', { name: 'Wave' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Orange Money' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'M-Pesa' })).not.toBeOnTheScreen();
  });
});

describe('the amount', () => {
  async function reachAmount(user: User) {
    await chooseCurrency(user, 'Nigerian Naira, NGN');
    await chooseMethod(user, 'Bank transfer');
    await user.press(await screen.findByRole('button', { name: 'Bank name' }));
    await user.press(await screen.findByRole('button', { name: 'Guaranty Trust Bank' }));
    await user.type(await screen.findByLabelText('Account number'), '0123456789');
    await screen.findByDisplayValue('Hannah Nuggest');
    await user.press(screen.getByRole('button', { name: 'Continue' }));
  }

  async function tap(user: User, keys: string[]) {
    for (const key of keys) {
      await user.press(screen.getByRole('button', { name: key }));
    }
  }

  it('carries the resolved recipient through', async () => {
    const user = userEvent.setup();
    await renderFlow();
    await reachAmount(user);

    expect(
      await screen.findByLabelText(/To, Hannah Nuggest, Guaranty Trust Bank/),
    ).toBeOnTheScreen();
  });

  it('types whole units before the decimal key, as every amount field here does', async () => {
    const user = userEvent.setup();
    await renderFlow();
    await reachAmount(user);

    await tap(user, ['5', '0']);

    expect(await screen.findByLabelText(/Amount to send, .*50\.00/)).toBeOnTheScreen();
  });

  it('offers a narration where the corridor sends one, without waiting for it', async () => {
    const user = userEvent.setup();
    await renderFlow();
    await reachAmount(user);

    await tap(user, ['5', '0']);

    expect(screen.getByLabelText('Transaction narration')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });
});
