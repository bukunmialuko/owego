import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { act, screen, userEvent, waitFor } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { http, HttpResponse } from 'msw';
import { Text } from 'react-native';
import { ok } from '@/core/result/result';
import type { Wallet, WalletBalancePort } from '@/core/wallet/wallet';
import { server, withMockServer } from '@/test/msw/server';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { buildMerchantCode } from '@/test/qr-payloads';
import { testAppConfig } from '@/test/test-config';
import { PaymentMethodCode } from '../../domain/entity/beneficiary-form';
import type { PayoutRecipient } from '../../domain/entity/payout-recipient';
import { resolveMerchantCode } from '../../domain/usecase/resolve-merchant-code-usecase';
import { ConfirmScreen } from './confirm-screen';
import type { BankTransferParamList } from './bank-transfer-param-list';

const Stack = createNativeStackNavigator<BankTransferParamList>();

const WALLET_ADDRESS = 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1';

const WALLETS: Wallet[] = [
  {
    id: 'base-wallet',
    address: '0xb249111111111111111111111111111111113901',
    blockchain: 'BASE-SEPOLIA',
    balances: [{ tokenId: 'usdc-base', symbol: 'USDC', amount: '9', decimals: 6 }],
  },
  {
    id: 'sol-wallet',
    address: WALLET_ADDRESS,
    blockchain: 'SOL-DEVNET',
    balances: [{ tokenId: 'usdc-sol', symbol: 'USDC', amount: '5136.98', decimals: 6 }],
  },
];

const NIGERIAN_RECIPIENT: PayoutRecipient = {
  displayName: 'Hannah Nuggest',
  subtitle: 'Guaranty Trust Bank • 0123456789',
  currency: 'NGN',
  method: PaymentMethodCode.BankTransfer,
  rail: 'bank_transfer',
  endpoint: '/transaction/wallet-to-bank',
  requiresNarration: true,
  limits: [],
  countryCode: 'NG',
  values: { bankCode: '058', accountNumber: '0123456789', accountName: 'Hannah Nuggest' },
  labels: { bankCode: 'Guaranty Trust Bank' },
};

const QR_STRING = '00020101021238570010A000000727012700069704220113VNPAY000000105303704';

const VIETNAMESE_MERCHANT: PayoutRecipient = {
  displayName: 'EXAMPLE MERCHANT',
  subtitle: 'VND',
  currency: 'VND',
  method: PaymentMethodCode.Crypto,
  rail: 'wallet',
  endpoint: '/transaction/qr-pay',
  requiresNarration: false,
  limits: [],
  countryCode: 'VN',
  values: { qrString: QR_STRING, merchantName: 'EXAMPLE MERCHANT' },
  labels: {},
};

const CHALLENGE = { challenge_id: 'chal_1', user_token: 'utok_1', encryption_key: 'key_1' };

function SuccessProbe({ route }: NativeStackScreenProps<BankTransferParamList, 'Success'>) {
  return <Text>{`ended ${route.params.outcome}`}</Text>;
}

withMockServer(
  http.get(`${testAppConfig.apiBaseUrl}/recipient`, () => HttpResponse.json({ data: [] })),
);

function recordRequests() {
  const sent: string[] = [];
  server.events.on('request:start', ({ request }) => {
    sent.push(`${request.method} ${new URL(request.url).pathname}`);
  });

  return sent;
}

function answer(path: string, data: Record<string, unknown>) {
  const bodies: unknown[] = [];
  server.use(
    http.post(`${testAppConfig.apiBaseUrl}${path}`, async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json({ data: { ...data, ...CHALLENGE }, status_code: 200, msg: '' });
    }),
  );

  return bodies;
}

async function renderConfirm(params: BankTransferParamList['Confirm']) {
  const executed: unknown[] = [];
  const walletBalancePort: WalletBalancePort = { listWallets: () => Promise.resolve(ok(WALLETS)) };

  await renderWithProviders(
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Confirm" component={ConfirmScreen} initialParams={params} />
      <Stack.Screen name="Success" component={SuccessProbe} />
    </Stack.Navigator>,
    {
      withNavigation: true,
      container: createTestContainer(
        {
          walletBalancePort: asValue(walletBalancePort),
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

describe('sending a payout', () => {
  it('initiates one NGN payout with the exact body and signs its challenge', async () => {
    const sent = recordRequests();
    const bodies = answer('/transaction/wallet-to-bank', {
      amount_fiat: 150_000,
      amount_usdc: 1.02,
      base_amount_usdc: 1,
      rate: 1_500,
    });
    const { executed } = await renderConfirm({
      recipient: NIGERIAN_RECIPIENT,
      fundingToken: 'USDC',
      amountMinor: 150_000,
      narration: 'For upkeep',
      origin: 'transfer',
    });

    expect(await screen.findByLabelText(/Total amount paid, ₦1,530\.00/)).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('ended sent')).toBeOnTheScreen();
    expect(bodies).toEqual([
      {
        wallet_id: 'sol-wallet',
        wallet_address: WALLET_ADDRESS,
        amount: 150_000,
        currency: 'NGN',
        token_id: 'usdc-sol',
        recipient_bank_code: '058',
        recipient_account_number: '0123456789',
        narration: 'For upkeep',
        save_beneficiary: false,
      },
    ]);
    expect(sent.filter((request) => request.startsWith('POST'))).toEqual([
      'POST /api/v1/transaction/wallet-to-bank',
    ]);
    expect(executed).toEqual([
      { challengeId: 'chal_1', userToken: 'utok_1', encryptionKey: 'key_1' },
    ]);
  });

  it('initiates one merchant QR payment with the exact body and signs its challenge', async () => {
    const sent = recordRequests();
    const bodies = answer('/transaction/qr-pay', {
      currency: 'VND',
      amount_local: 250_000,
      amount_usdc: 10,
      base_amount_usdc: 9.8,
      fee: { total_fee: 0.2 },
      rate: 0.0000392,
    });
    const { executed } = await renderConfirm({
      recipient: VIETNAMESE_MERCHANT,
      fundingToken: 'USDC',
      amountMinor: 25_000_000,
      narration: '',
      origin: 'scan',
    });

    expect(await screen.findByLabelText(/Total amount paid/)).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('ended sent')).toBeOnTheScreen();
    expect(bodies).toEqual([
      {
        qr_string: QR_STRING,
        wallet_id: 'sol-wallet',
        wallet_address: WALLET_ADDRESS,
        token_id: 'usdc-sol',
        amount: 250_000,
      },
    ]);
    expect(sent.filter((request) => request.startsWith('POST'))).toEqual([
      'POST /api/v1/transaction/qr-pay',
    ]);
    expect(executed).toEqual([
      { challengeId: 'chal_1', userToken: 'utok_1', encryptionKey: 'key_1' },
    ]);
  });
});

function answerRecipients({ saved }: { saved?: Promise<void> } = {}) {
  const requests: string[] = [];
  const created: unknown[] = [];
  server.use(
    http.get(`${testAppConfig.apiBaseUrl}/recipient`, ({ request }) => {
      requests.push(`GET ${new URL(request.url).search}`);
      return HttpResponse.json({ data: [] });
    }),
    http.post(`${testAppConfig.apiBaseUrl}/recipient`, async ({ request }) => {
      requests.push('POST');
      created.push(await request.json());
      await saved;
      return HttpResponse.json({ data: { id: 'r1' } });
    }),
  );

  return { requests, created };
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

const NAIRA_FIGURES = { amount_fiat: 150_000, amount_usdc: 1.02, base_amount_usdc: 1, rate: 1_500 };

const NAIRA_PARAMS: BankTransferParamList['Confirm'] = {
  recipient: NIGERIAN_RECIPIENT,
  fundingToken: 'USDC',
  amountMinor: 150_000,
  narration: 'For upkeep',
  origin: 'transfer',
};

describe('saving the payee after a payout', () => {
  it('saves nobody when the switch is left off', async () => {
    const recipients = answerRecipients();
    answer('/transaction/wallet-to-bank', NAIRA_FIGURES);
    await renderConfirm(NAIRA_PARAMS);

    await screen.findByLabelText(/Total amount paid/);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText('ended sent')).toBeOnTheScreen();
    await settle();

    expect(recipients.requests).toEqual([]);
  });

  it('pays exactly as before, then saves the payee the payer confirmed', async () => {
    const recipients = answerRecipients();
    const bodies = answer('/transaction/wallet-to-bank', NAIRA_FIGURES);
    await renderConfirm(NAIRA_PARAMS);
    const user = userEvent.setup();

    await screen.findByLabelText(/Total amount paid/);
    await user.press(screen.getByRole('switch', { name: 'Save as beneficiary' }));
    await user.press(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('ended sent')).toBeOnTheScreen();
    expect(bodies).toEqual([
      {
        wallet_id: 'sol-wallet',
        wallet_address: WALLET_ADDRESS,
        amount: 150_000,
        currency: 'NGN',
        token_id: 'usdc-sol',
        recipient_bank_code: '058',
        recipient_account_number: '0123456789',
        narration: 'For upkeep',
        save_beneficiary: false,
      },
    ]);
    await waitFor(() => {
      expect(recipients.created).toHaveLength(1);
    });
    expect(recipients.requests).toEqual(['GET ?page=1&type=all', 'POST']);
    expect(recipients.created).toEqual([
      {
        bank_account_information: {
          bank_country: 'NG',
          bank_name: 'Guaranty Trust Bank',
          bank_code: '058',
          account_holder: 'Hannah Nuggest',
          swift_number: '',
          account_number: '0123456789',
        },
        contact_information: {
          contact_country: '',
          state: '',
          city: '',
          address: '',
          zip_code: '',
          email: '',
        },
      },
    ]);
  });

  it('shows the result while the save is still on the wire', async () => {
    let release = (): void => undefined;
    const recipients = answerRecipients({
      saved: new Promise((resolve) => {
        release = resolve;
      }),
    });
    answer('/transaction/wallet-to-bank', NAIRA_FIGURES);
    await renderConfirm(NAIRA_PARAMS);
    const user = userEvent.setup();

    await screen.findByLabelText(/Total amount paid/);
    await user.press(screen.getByRole('switch', { name: 'Save as beneficiary' }));
    await user.press(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('ended sent')).toBeOnTheScreen();
    await waitFor(() => {
      expect(recipients.requests).toContain('POST');
    });

    release();
    await settle();
  });

  it.each([
    ['saved', true],
    ['not saved', false],
  ])('pays a merchant %s with the same qr-pay body', async (_, saving) => {
    const sticker = buildMerchantCode({ merchantName: 'EXAMPLE MERCHANT' });
    const resolved = resolveMerchantCode(sticker);
    if (resolved.kind !== 'merchant') throw new Error('the sticker should be payable');
    const sent = recordRequests();
    const recipients = answerRecipients();
    const bodies = answer('/transaction/qr-pay', {
      currency: 'VND',
      amount_local: 250_000,
      amount_usdc: 10,
      base_amount_usdc: 9.8,
      fee: { total_fee: 0.2 },
      rate: 0.0000392,
    });
    await renderConfirm({
      recipient: resolved.recipient,
      fundingToken: 'USDC',
      amountMinor: 25_000_000,
      narration: '',
      origin: 'scan',
    });
    const user = userEvent.setup();

    await screen.findByLabelText(/Total amount paid/);
    if (saving) {
      await user.press(screen.getByRole('switch', { name: 'Save as beneficiary' }));
    }
    await user.press(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText('ended sent')).toBeOnTheScreen();
    await settle();

    expect(bodies).toEqual([
      {
        qr_string: sticker,
        wallet_id: 'sol-wallet',
        wallet_address: WALLET_ADDRESS,
        token_id: 'usdc-sol',
        amount: 250_000,
      },
    ]);
    if (saving) {
      await waitFor(() => {
        expect(recipients.created).toEqual([
          { beneficiary_type: 'qr', meta_data: { qr_string: sticker } },
        ]);
      });
    } else {
      expect(recipients.requests).not.toContain('POST');
      expect(sent.filter((request) => request.startsWith('POST'))).toEqual([
        'POST /api/v1/transaction/qr-pay',
      ]);
    }
  });
});
