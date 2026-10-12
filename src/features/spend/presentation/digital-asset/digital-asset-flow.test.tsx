import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { act, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { stubWindowLayout } from '@/test/stub-window-layout';
import { DigitalAssetNavigator } from './digital-asset-navigator';

jest.useFakeTimers();

const SOLANA_ADDRESS = 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1';
const EVM_ADDRESS = '0xb249111111111111111111111111111111110e93';
const BALANCE = '$5,136.98';

function renderFlow() {
  return renderWithProviders(<DigitalAssetNavigator />, {
    withNavigation: true,
    container: createTestContainer(),
  });
}

const Root = createNativeStackNavigator();

function BehindTheFlow() {
  return <Text>the screen the flow was opened from</Text>;
}

function ScannerProbe() {
  return <Text>the scanner</Text>;
}

function renderFlowOverApp(navigationRef = createNavigationContainerRef()) {
  return renderWithProviders(
    <NavigationContainer
      ref={navigationRef}
      initialState={{ index: 1, routes: [{ name: 'Behind' }, { name: 'SendAsset' }] }}
    >
      <Root.Navigator screenOptions={{ headerShown: false }}>
        <Root.Screen name="Behind" component={BehindTheFlow} />
        <Root.Screen name="SendAsset" component={DigitalAssetNavigator} />
        <Root.Screen name="ScanToPay" component={ScannerProbe} />
      </Root.Navigator>
    </NavigationContainer>,
    { container: createTestContainer() },
  );
}

type User = ReturnType<typeof userEvent.setup>;

async function reachAmountScreen(user: User) {
  await user.type(await screen.findByLabelText('Wallet address'), SOLANA_ADDRESS);
  await user.press(await screen.findByRole('button', { name: 'Continue' }));
}

async function openTokenMenu(user: User, current = 'USDC') {
  await user.press(await screen.findByRole('button', { name: `Token, ${current}` }));
}

async function chooseToken(user: User, symbol: string) {
  await openTokenMenu(user);
  await user.press(await screen.findByRole('button', { name: new RegExp(`^${symbol},`) }));
}

let windowLayout: ReturnType<typeof stubWindowLayout>;

beforeEach(() => {
  windowLayout = stubWindowLayout({ x: 16, y: 136, width: 112, height: 44 });
});

afterEach(() => {
  windowLayout.mockRestore();
});

async function tap(user: User, keys: string[]) {
  for (const key of keys) {
    await user.press(screen.getByRole('button', { name: key }));
  }
}

describe('choosing a recipient', () => {
  it('will not continue until an address is given', async () => {
    await renderFlow();

    expect(await screen.findByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('offers Solana only', async () => {
    const user = userEvent.setup();
    await renderFlow();

    await user.press(await screen.findByRole('button', { name: 'Network' }));

    expect(await screen.findByRole('button', { name: 'Solana, SOL' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Base/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Monad/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Arc/ })).toBeNull();
  });

  it('refuses an EVM address, saying sending is Solana only', async () => {
    const user = userEvent.setup();
    await renderFlow();

    await user.type(await screen.findByLabelText('Wallet address'), EVM_ADDRESS);

    expect(
      await screen.findByRole('alert', { name: /Sending is only available on Solana/ }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('says nothing about the address until the field has been touched', async () => {
    await renderFlow();

    await screen.findByLabelText('Wallet address');

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('accepts a matching address', async () => {
    const user = userEvent.setup();
    await renderFlow();

    await user.type(await screen.findByLabelText('Wallet address'), SOLANA_ADDRESS);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('fills every field at once from a saved wallet', async () => {
    const user = userEvent.setup();
    await renderFlow();

    await user.press(await screen.findByRole('button', { name: 'Saved Beneficiaries' }));
    await user.press(await screen.findByRole('button', { name: 'Main wallet, Bxxxxx…xxx3' }));

    expect(
      await screen.findByDisplayValue('Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx3'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Network' })).toHaveAccessibilityValue({
      text: 'Solana',
    });
    expect(await screen.findByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('keeps a saved Base wallet on Solana and says it cannot be paid', async () => {
    const user = userEvent.setup();
    await renderFlow();

    await chooseToken(user, 'USDT');
    await user.press(await screen.findByRole('button', { name: 'Saved Beneficiaries' }));
    await user.press(await screen.findByRole('button', { name: /^Business wallet,/ }));

    expect(
      await screen.findByDisplayValue('0xb249111111111111111111111111111111113901'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Network' })).toHaveAccessibilityValue({
      text: 'Solana',
    });
    expect(screen.getByRole('button', { name: 'Token, USDT' })).toBeOnTheScreen();
    expect(
      await screen.findByRole('alert', { name: /Sending is only available on Solana/ }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('switches between the USDC and USDT wallets', async () => {
    const user = userEvent.setup();
    await renderFlow();

    expect(await screen.findByRole('button', { name: 'Token, USDC' })).toBeOnTheScreen();

    await chooseToken(user, 'USDT');

    expect(await screen.findByRole('button', { name: 'Token, USDT' })).toBeOnTheScreen();

    await openTokenMenu(user, 'USDT');

    expect(await screen.findByRole('button', { name: /^USDT,/ })).toBeSelected();
    expect(screen.getByRole('button', { name: /^USDC,/ })).not.toBeSelected();
  });

  it('offers only saved wallets', async () => {
    const user = userEvent.setup();
    await renderFlow();

    await user.press(await screen.findByRole('button', { name: 'Saved Beneficiaries' }));

    expect(await screen.findByRole('button', { name: /^Main wallet,/ })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Jasper Nwosu,/ })).not.toBeOnTheScreen();
  });

  it('opens scan to pay from the header, over the flow', async () => {
    const user = userEvent.setup();
    await renderFlowOverApp();

    await screen.findByRole('button', { name: 'Token, USDC' });
    await user.press(screen.getByRole('button', { name: 'Scan to pay' }));

    expect(await screen.findByText('the scanner')).toBeOnTheScreen();
  });
});

describe('entering an amount', () => {
  it('shows the wallet balance and who is being paid', async () => {
    const user = userEvent.setup();
    await renderFlow();
    await reachAmountScreen(user);

    expect(await screen.findByLabelText(`Wallet balance, ${BALANCE}`)).toBeTruthy();
    expect(screen.getByLabelText(new RegExp(`To, ${SOLANA_ADDRESS}, Solana`))).toBeTruthy();
  });

  it('shows the address shortened once, not twice', async () => {
    const user = userEvent.setup();
    await renderFlow();
    await reachAmountScreen(user);

    expect(await screen.findByText('Axxxxxxxxxxxxxxxxxxxxxxxxx…')).toBeOnTheScreen();
  });

  it('starts at nothing, with the cents shown but not entered', async () => {
    const user = userEvent.setup();
    await renderFlow();
    await reachAmountScreen(user);

    expect(await screen.findByLabelText('Amount to send, $0.00')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('types whole dollars until the decimal key is pressed', async () => {
    const user = userEvent.setup();
    await renderFlow();
    await reachAmountScreen(user);

    await tap(user, ['5', '0']);
    expect(await screen.findByLabelText('Amount to send, $50.00')).toBeTruthy();

    await tap(user, ['Decimal point', '2', '5']);
    expect(await screen.findByLabelText('Amount to send, $50.25')).toBeTruthy();
  });

  it('does not let a third digit run into the cents', async () => {
    const user = userEvent.setup();
    await renderFlow();
    await reachAmountScreen(user);

    await tap(user, ['1', '2', '3']);

    expect(await screen.findByLabelText('Amount to send, $123.00')).toBeTruthy();
  });

  it('deletes back through the cents and out of them', async () => {
    const user = userEvent.setup();
    await renderFlow();
    await reachAmountScreen(user);

    await tap(user, ['5', '0', 'Decimal point', '2', '5']);
    await tap(user, ['Clear', 'Clear', 'Clear']);

    expect(await screen.findByLabelText('Amount to send, $50.00')).toBeTruthy();

    await tap(user, ['Clear']);
    expect(await screen.findByLabelText('Amount to send, $5.00')).toBeTruthy();
  });

  it('spends the whole balance on Max', async () => {
    const user = userEvent.setup();
    await renderFlow();
    await reachAmountScreen(user);

    await user.press(await screen.findByRole('button', { name: 'Max' }));

    expect(await screen.findByLabelText(`Amount to send, ${BALANCE}`)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('takes a share of the balance from a percentage shortcut', async () => {
    const user = userEvent.setup();
    await renderFlow();
    await reachAmountScreen(user);

    await user.press(await screen.findByRole('button', { name: '50% of balance' }));

    expect(await screen.findByLabelText('Amount to send, $2,568.49')).toBeTruthy();
  });

  it('refuses more than the balance', async () => {
    const user = userEvent.setup();
    await renderFlow();
    await reachAmountScreen(user);

    await tap(user, ['9', '9', '9', '9', '9']);

    expect(await screen.findByRole('alert', { name: 'Insufficient balance' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});

describe('confirming and sending', () => {
  async function reachConfirm(user: User) {
    await reachAmountScreen(user);
    await tap(user, ['5', '0']);
    await user.press(await screen.findByRole('button', { name: 'Continue' }));
  }

  it('lays the payment out before it is authorised, with no fee row', async () => {
    const user = userEvent.setup();
    await renderFlow();
    await reachConfirm(user);

    expect(await screen.findByRole('header', { name: 'Confirm payment' })).toBeTruthy();
    expect(await screen.findByLabelText('Total amount paid, $50.00')).toBeTruthy();
    expect(screen.getByLabelText('Recipient gets, 50.00 USDC')).toBeTruthy();
    expect(await screen.findByLabelText(`Balance, ${BALANCE}`)).toBeTruthy();
    expect(screen.queryByLabelText(/^Fee/)).toBeNull();
  });

  it('offers to save the recipient, off by default', async () => {
    const user = userEvent.setup();
    await renderFlow();
    await reachConfirm(user);

    expect(await screen.findByRole('switch', { name: 'Save as beneficiary' })).not.toBeChecked();
  });

  it('shows a receipt once the payment is away', async () => {
    const user = userEvent.setup();
    await renderFlow();
    await reachConfirm(user);

    await user.press(await screen.findByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('Transaction successful')).toBeTruthy();
    expect(screen.getByText('$50')).toBeTruthy();
    expect(screen.getByLabelText('Total amount paid, $50.00')).toBeTruthy();
  });

  it('closes the whole flow from the receipt, not just the receipt', async () => {
    const user = userEvent.setup();
    await renderFlowOverApp();
    await reachConfirm(user);
    await user.press(await screen.findByRole('button', { name: 'Confirm' }));
    await screen.findByText('Transaction successful');

    await user.press(screen.getByRole('button', { name: 'Close' }));

    expect(await screen.findByText('the screen the flow was opened from')).toBeOnTheScreen();
    expect(screen.queryByText('Transaction successful')).not.toBeOnTheScreen();
  });

  it('leaves the flow on back from the result, never returning to the amount step', async () => {
    const user = userEvent.setup();
    const navigationRef = createNavigationContainerRef();
    await renderFlowOverApp(navigationRef);
    await reachConfirm(user);
    await user.press(await screen.findByRole('button', { name: 'Confirm' }));
    await screen.findByText('Transaction successful');

    await act(async () => {
      navigationRef.goBack();
      await Promise.resolve();
    });

    expect(await screen.findByText('the screen the flow was opened from')).toBeOnTheScreen();
    expect(screen.queryByLabelText(/^Amount to send/)).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeOnTheScreen();
  });
});
