import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { http, HttpResponse } from 'msw';
import { Text } from 'react-native';
import type { FxRateRepository } from '@/core/fx/fx-rate';
import { ok } from '@/core/result/result';
import type { Wallet, WalletBalancePort } from '@/core/wallet/wallet';
import { server, withMockServer } from '@/test/msw/server';
import { buildMerchantCode } from '@/test/qr-payloads';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { testAppConfig } from '@/test/test-config';
import { ConfirmScreen } from './confirm-screen';
import { MerchantAmountScreen } from './merchant-amount-screen';
import type { BankTransferParamList } from './bank-transfer-param-list';

const Stack = createNativeStackNavigator<BankTransferParamList>();

const WALLET_ADDRESS = 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1';

const WALLETS: Wallet[] = [
  {
    id: 'sol-wallet',
    address: WALLET_ADDRESS,
    blockchain: 'SOL-DEVNET',
    balances: [{ tokenId: 'usdc-sol', symbol: 'USDC', amount: '5136.98', decimals: 6 }],
  },
];

const DONG_RATE: FxRateRepository = {
  getQuote: (baseCurrency, quoteCurrency) =>
    Promise.resolve(ok({ baseCurrency, quoteCurrency, rate: 25_000 })),
};

const CHALLENGE = { challenge_id: 'chal_1', user_token: 'utok_1', encryption_key: 'key_1' };

function SuccessProbe({ route }: NativeStackScreenProps<BankTransferParamList, 'Success'>) {
  return <Text>{`ended ${route.params.outcome}`}</Text>;
}

withMockServer();

function answerQrPay() {
  const bodies: unknown[] = [];
  server.use(
    http.post(`${testAppConfig.apiBaseUrl}/transaction/qr-pay`, async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json({
        data: {
          currency: 'VND',
          amount_local: 100_000,
          amount_usdc: 4.1,
          base_amount_usdc: 4,
          fee: { total_fee: 0.1 },
          rate: 0.00004,
          ...CHALLENGE,
        },
        status_code: 200,
        msg: '',
      });
    }),
    http.get(`${testAppConfig.apiBaseUrl}/recipient`, () => HttpResponse.json({ data: [] })),
  );

  return bodies;
}

async function renderMerchantPayment(qrString: string) {
  const executed: unknown[] = [];
  const walletBalancePort: WalletBalancePort = { listWallets: () => Promise.resolve(ok(WALLETS)) };

  await renderWithProviders(
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="MerchantAmount"
        component={MerchantAmountScreen}
        initialParams={{ qrString }}
      />
      <Stack.Screen name="Confirm" component={ConfirmScreen} />
      <Stack.Screen name="Success" component={SuccessProbe} />
    </Stack.Navigator>,
    {
      withNavigation: true,
      container: createTestContainer(
        {
          walletBalancePort: asValue(walletBalancePort),
          fxRateRepository: asValue(DONG_RATE),
          circleWalletPort: asValue({
            executeChallenge: (challenge: unknown) => {
              executed.push(challenge);
              return Promise.resolve(
                ok({
                  type: 'settled' as const,
                  status: 'complete' as const,
                  resultType: 'create-transaction' as const,
                }),
              );
            },
          }),
        },
        { ...testAppConfig, usePreviewData: false },
      ),
    },
  );

  return { executed };
}

describe('paying a merchant from its code', () => {
  it('pays the amount a code names, as qr-pay was given it, and signs its challenge', async () => {
    const bill = buildMerchantCode({ merchantName: 'PHO 24', amount: '100000' });
    const bodies = answerQrPay();
    const { executed } = await renderMerchantPayment(bill);
    const user = userEvent.setup();

    await user.press(await screen.findByRole('button', { name: 'Continue' }));
    await screen.findByLabelText(/Total amount paid/);
    await user.press(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('ended sent')).toBeOnTheScreen();
    expect(bodies).toEqual([
      {
        qr_string: bill,
        wallet_id: 'sol-wallet',
        wallet_address: WALLET_ADDRESS,
        token_id: 'usdc-sol',
        amount: 100_000,
      },
    ]);
    expect(executed).toEqual([
      { challengeId: 'chal_1', userToken: 'utok_1', encryptionKey: 'key_1' },
    ]);
  });

  it('pays the exact local price the payer typed for a sticker', async () => {
    const sticker = buildMerchantCode({ merchantName: 'PHO 24' });
    const bodies = answerQrPay();
    await renderMerchantPayment(sticker);
    const user = userEvent.setup();

    const toDong = await screen.findByRole('button', { name: 'Switch to VND' });
    await waitFor(() => {
      expect(toDong).toBeEnabled();
    });
    await user.press(toDong);
    for (const key of ['4', '5', '0', '0', '0']) {
      await user.press(screen.getByRole('button', { name: key }));
    }
    await user.press(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByLabelText(/Total amount paid/);
    await user.press(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('ended sent')).toBeOnTheScreen();
    expect(bodies).toEqual([
      {
        qr_string: sticker,
        wallet_id: 'sol-wallet',
        wallet_address: WALLET_ADDRESS,
        token_id: 'usdc-sol',
        amount: 45_000,
      },
    ]);
  });
});
