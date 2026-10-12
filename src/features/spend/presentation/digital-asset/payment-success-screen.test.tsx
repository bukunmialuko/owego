import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { screen } from '@testing-library/react-native';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { PaymentSuccessScreen } from './payment-success-screen';
import type { SentOutcome } from '../../domain/entity/send-outcome';
import type { DigitalAssetParamList } from './digital-asset-param-list';

const Stack = createNativeStackNavigator<DigitalAssetParamList>();

const SOLANA_ADDRESS = 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1';

async function renderResult(outcome: SentOutcome) {
  await renderWithProviders(
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="Success"
        component={PaymentSuccessScreen}
        initialParams={{
          recipient: {
            address: SOLANA_ADDRESS,
            tokenSymbol: 'USDT',
            networkCode: 'SOL',
            networkName: 'Solana',
          },
          amountMinor: 5_000,
          outcome,
        }}
      />
    </Stack.Navigator>,
    { withNavigation: true, container: createTestContainer() },
  );
}

describe('the payment result', () => {
  it('says the transaction was successful, with what went where', async () => {
    await renderResult('sent');

    expect(await screen.findByText('Transaction successful')).toBeOnTheScreen();
    expect(screen.getByText('$50')).toBeOnTheScreen();
    expect(screen.getByLabelText('Total amount paid, $50.00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Recipient gets, 50.00 USDT')).toBeOnTheScreen();
    expect(screen.getByTestId('payment-sent-art')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Share receipt' })).toBeOnTheScreen();
  });

  it('shows no balance', async () => {
    await renderResult('sent');

    await screen.findByText('Transaction successful');

    expect(screen.queryByLabelText(/^Balance/)).not.toBeOnTheScreen();
  });

  it('says a processing payment is on its way, and to check before sending again', async () => {
    await renderResult('processing');

    expect(await screen.findByText('Payment processing')).toBeOnTheScreen();
    expect(screen.getByText(/Check your transactions before you send it again/)).toBeOnTheScreen();
    expect(screen.queryByText('Transaction successful')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('payment-sent-art')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Share receipt' })).not.toBeOnTheScreen();
  });

  it('says an unconfirmed payment could not be confirmed, and to check before sending again', async () => {
    await renderResult('unconfirmed');

    expect(await screen.findByText('Payment not confirmed')).toBeOnTheScreen();
    expect(screen.getByText(/couldn’t confirm whether this payment went out/)).toBeOnTheScreen();
    expect(screen.queryByTestId('payment-sent-art')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Share receipt' })).not.toBeOnTheScreen();
  });

  it.each<SentOutcome>(['sent', 'processing', 'unconfirmed'])(
    'offers only a way out after a %s payment, never another go',
    async (outcome) => {
      await renderResult(outcome);

      expect(await screen.findByRole('button', { name: 'Done' })).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeOnTheScreen();
    },
  );
});
