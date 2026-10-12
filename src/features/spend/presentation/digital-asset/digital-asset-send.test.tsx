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
import { testAppConfig } from '@/test/test-config';
import { ConfirmPaymentScreen } from './confirm-payment-screen';
import { SendAmountScreen } from './send-amount-screen';
import type { DigitalAssetParamList } from './digital-asset-param-list';

const Stack = createNativeStackNavigator<DigitalAssetParamList>();

const ENDPOINT = `${testAppConfig.apiBaseUrl}/transaction/challenge-id`;
const SOLANA_ADDRESS = 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1';

const WALLETS: Wallet[] = [
  {
    id: 'base-wallet',
    address: '0xb249111111111111111111111111111111113901',
    blockchain: 'BASE-SEPOLIA',
    balances: [{ tokenId: 'usdc-base', symbol: 'USDC', amount: '900', decimals: 6 }],
  },
  {
    id: 'sol-wallet',
    address: 'own-solana-address',
    blockchain: 'SOL-DEVNET',
    balances: [
      { tokenId: 'usdc-sol', symbol: 'USDC', amount: '5.136', decimals: 6 },
      { tokenId: 'usdt-sol', symbol: 'USDT', amount: '12.5', decimals: 6 },
    ],
  },
];

function SuccessProbe({ route }: NativeStackScreenProps<DigitalAssetParamList, 'Success'>) {
  return <Text>{`ended ${route.params.outcome}`}</Text>;
}

withMockServer();

let recipients: { requests: string[]; created: unknown[] };
let holdSave: Promise<void> = Promise.resolve();

beforeEach(() => {
  const requests: string[] = [];
  const created: unknown[] = [];
  recipients = { requests, created };
  holdSave = Promise.resolve();
  server.use(
    http.get(`${testAppConfig.apiBaseUrl}/recipient`, ({ request }) => {
      requests.push(`GET ${new URL(request.url).search}`);
      return HttpResponse.json({ data: [] });
    }),
    http.post(`${testAppConfig.apiBaseUrl}/recipient`, async ({ request }) => {
      requests.push('POST');
      created.push(await request.json());
      await holdSave;
      return HttpResponse.json({ data: { id: 'r1' } });
    }),
  );
});

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

function recordRequests() {
  const sent: string[] = [];
  server.events.on('request:start', ({ request }) => {
    sent.push(`${request.method} ${new URL(request.url).pathname}`);
  });

  return sent;
}

function answerChallenges() {
  const bodies: unknown[] = [];
  server.use(
    http.post(ENDPOINT, async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json({
        data: { challenge_id: 'chal_1', user_token: 'utok_1', encryption_key: 'key_1' },
        error: false,
      });
    }),
  );

  return bodies;
}

type CircleAnswer =
  | { type: 'cancelled' }
  | {
      type: 'settled';
      status: 'complete';
      resultType: 'create-transaction';
    };

const COMPLETE: CircleAnswer = {
  type: 'settled',
  status: 'complete',
  resultType: 'create-transaction',
};

async function renderSend(tokenSymbol: 'USDC' | 'USDT', circle: CircleAnswer = COMPLETE) {
  const executed: unknown[] = [];
  const walletBalancePort: WalletBalancePort = { listWallets: () => Promise.resolve(ok(WALLETS)) };

  await renderWithProviders(
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="Amount"
        component={SendAmountScreen}
        initialParams={{
          recipient: {
            address: SOLANA_ADDRESS,
            tokenSymbol,
            networkCode: 'SOL',
            networkName: 'Solana',
          },
        }}
      />
      <Stack.Screen name="Confirm" component={ConfirmPaymentScreen} />
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
              return Promise.resolve(ok(circle));
            },
          }),
        },
        { ...testAppConfig, usePreviewData: false },
      ),
    },
  );

  return { executed };
}

async function pressKeys(keys: string[]) {
  const user = userEvent.setup();
  for (const key of keys) {
    await user.press(await screen.findByRole('button', { name: key }));
  }
}

async function continueAndConfirm() {
  const user = userEvent.setup();
  await user.press(screen.getByRole('button', { name: 'Continue' }));
  await user.press(await screen.findByRole('button', { name: 'Confirm' }));
}

describe('sending a digital asset', () => {
  it('posts exactly what the payer confirmed, from the wallet the token is held in', async () => {
    const sent = recordRequests();
    const bodies = answerChallenges();
    const { executed } = await renderSend('USDT');

    await pressKeys(['0', 'Decimal point', '1']);
    await continueAndConfirm();

    expect(await screen.findByText('ended sent')).toBeOnTheScreen();
    expect(bodies).toEqual([
      {
        wallet_id: 'sol-wallet',
        amount: '0.1',
        destination_address: SOLANA_ADDRESS,
        token_id: 'usdt-sol',
      },
    ]);
    expect(sent.filter((request) => request.startsWith('POST'))).toEqual([
      'POST /api/v1/transaction/challenge-id',
    ]);
    expect(executed).toEqual([
      { challengeId: 'chal_1', userToken: 'utok_1', encryptionKey: 'key_1' },
    ]);
  });

  it('posts 5.13, not 5.14, when Max is pressed on a balance of 5.136', async () => {
    const bodies = answerChallenges();
    await renderSend('USDC');

    await pressKeys(['Max']);
    await continueAndConfirm();

    expect(await screen.findByText('ended sent')).toBeOnTheScreen();
    expect(bodies).toEqual([
      {
        wallet_id: 'sol-wallet',
        amount: '5.13',
        destination_address: SOLANA_ADDRESS,
        token_id: 'usdc-sol',
      },
    ]);
  });
});

describe('saving the wallet after a send', () => {
  async function switchSavingOn(walletTag: string) {
    const user = userEvent.setup();
    await user.press(await screen.findByRole('switch', { name: 'Save as beneficiary' }));
    await user.type(await screen.findByLabelText('Wallet tag'), walletTag);
    await user.press(screen.getByRole('button', { name: 'Save' }));
  }

  async function continueToConfirm() {
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByRole('button', { name: 'Confirm' });
  }

  async function pressConfirm() {
    await userEvent.setup().press(screen.getByRole('button', { name: 'Confirm' }));
  }

  it('saves nobody when the switch is left off', async () => {
    answerChallenges();
    await renderSend('USDT');

    await pressKeys(['0', 'Decimal point', '1']);
    await continueAndConfirm();
    expect(await screen.findByText('ended sent')).toBeOnTheScreen();
    await settle();

    expect(recipients.requests).not.toContain('POST');
  });

  it('sends exactly as before, then saves the wallet under its tag', async () => {
    const bodies = answerChallenges();
    await renderSend('USDT');

    await pressKeys(['0', 'Decimal point', '1']);
    await continueToConfirm();
    await switchSavingOn('Tunde’s wallet');
    await pressConfirm();

    expect(await screen.findByText('ended sent')).toBeOnTheScreen();
    expect(bodies).toEqual([
      {
        wallet_id: 'sol-wallet',
        amount: '0.1',
        destination_address: SOLANA_ADDRESS,
        token_id: 'usdt-sol',
      },
    ]);
    await waitFor(() => {
      expect(recipients.created).toHaveLength(1);
    });
    expect(recipients.created).toEqual([
      {
        bank_account_information: {
          bank_country: '',
          bank_name: 'SOL',
          bank_code: '',
          account_holder: 'Tunde’s wallet',
          swift_number: '',
          account_number: SOLANA_ADDRESS,
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
    holdSave = new Promise((resolve) => {
      release = resolve;
    });
    answerChallenges();
    await renderSend('USDT');

    await pressKeys(['0', 'Decimal point', '1']);
    await continueToConfirm();
    await switchSavingOn('Tunde’s wallet');
    await pressConfirm();

    expect(await screen.findByText('ended sent')).toBeOnTheScreen();
    await waitFor(() => {
      expect(recipients.requests).toContain('POST');
    });

    release();
    await settle();
  });

  it('saves nothing when the PIN sheet is closed', async () => {
    answerChallenges();
    await renderSend('USDT', { type: 'cancelled' });

    await pressKeys(['0', 'Decimal point', '1']);
    await continueToConfirm();
    await switchSavingOn('Tunde’s wallet');
    await pressConfirm();
    await settle();

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeOnTheScreen();
    expect(recipients.requests).not.toContain('POST');
  });
});
