import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { QueryClient } from '@tanstack/react-query';
import { act, screen, userEvent, waitFor } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { Text } from 'react-native';
import { setGenericPassword } from 'react-native-keychain';
import { offline, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { testAppConfig } from '@/test/test-config';
import type {
  DepositSubmission,
  DepositTransfer,
  RecentBlockhash,
} from '../../domain/entity/external-deposit';
import type { ConnectOutcome, ExternalWalletAccount } from '../../domain/entity/external-wallet';
import type { ExternalWalletPort } from '../../domain/port/external-wallet-port';
import type { SolanaNetworkRepository } from '../../domain/repository/solana-network-repository';
import { ExternalWalletDepositScreen } from './external-wallet-deposit-screen';
import type { ExternalWalletDepositParamList } from './external-wallet-deposit-param-list';

const Stack = createNativeStackNavigator<ExternalWalletDepositParamList>();

const WALLET = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';
const CIRCLE = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin';
const AUTH_TOKEN = 'wallet-auth-token-for-this-page';
const SIGNATURE =
  '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';
const ACCOUNT: ExternalWalletAccount = { address: WALLET, authToken: AUTH_TOKEN };
const BLOCKHASH: RecentBlockhash = {
  blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
  lastValidBlockHeight: 300n,
  minContextSlot: 250n,
};
const CONNECTED: Result<ConnectOutcome, AppError> = ok({ type: 'connected', account: ACCOUNT });

type Sent = {
  account: ExternalWalletAccount;
  transfer: DepositTransfer;
  blockhash: RecentBlockhash;
};

function ResultProbe({ route }: NativeStackScreenProps<ExternalWalletDepositParamList, 'Result'>) {
  return <Text>{`result ${JSON.stringify(route.params)}`}</Text>;
}

function fakeWallet({
  connects = [CONNECTED],
  answer = () => Promise.resolve(ok({ type: 'submitted', signature: SIGNATURE })),
}: {
  connects?: Result<ConnectOutcome, AppError>[];
  answer?: () => Promise<Result<DepositSubmission, AppError>>;
} = {}) {
  const sent: Sent[] = [];
  const connect = jest.fn(() =>
    Promise.resolve(connects.length > 1 ? (connects.shift() as never) : (connects[0] as never)),
  );
  const port: ExternalWalletPort = {
    connect,
    signAndSend: (account, transfer, blockhash) => {
      sent.push({ account, transfer, blockhash });
      return answer();
    },
  };
  return { port, connect, sent };
}

function fakeNetwork(
  balance: Result<bigint, AppError> = ok(125_500_000n),
): SolanaNetworkRepository {
  return {
    getRecentBlockhash: () => Promise.resolve(ok(BLOCKHASH)),
    getTokenBalance: () => Promise.resolve(balance),
    getSignatureStatus: () => Promise.resolve(ok({ type: 'unknown' })),
  };
}

async function renderDeposit({
  wallet = fakeWallet(),
  network = fakeNetwork(),
  cluster = 'devnet',
  queryClient,
}: {
  wallet?: ReturnType<typeof fakeWallet>;
  network?: SolanaNetworkRepository;
  cluster?: 'devnet' | 'mainnet-beta';
  queryClient?: QueryClient;
} = {}) {
  const container = createTestContainer(
    {
      externalWalletPort: asValue(wallet.port),
      solanaNetworkRepository: asValue(network),
      solanaWalletAddressPort: asValue({ getSolanaAddress: () => Promise.resolve(ok(CIRCLE)) }),
    },
    { ...testAppConfig, usePreviewData: true, solanaCluster: cluster },
  );

  await renderWithProviders(
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Deposit" component={ExternalWalletDepositScreen} />
      <Stack.Screen name="Result" component={ResultProbe} />
    </Stack.Navigator>,
    { withNavigation: true, container, ...(queryClient === undefined ? {} : { queryClient }) },
  );

  return wallet;
}

async function typeAmount(user: ReturnType<typeof userEvent.setup>, keys: string[]) {
  for (const key of keys) {
    await user.press(screen.getByRole('button', { name: key === '.' ? 'Decimal point' : key }));
  }
}

const user = () => userEvent.setup();

function watchedQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
}

describe('ExternalWalletDepositScreen', () => {
  describe('connecting', () => {
    it('asks the wallet to connect as soon as the page opens, and only once', async () => {
      const wallet = await renderDeposit();

      await screen.findByText('Connected: HN7cABqL…YWrH');
      expect(wallet.connect).toHaveBeenCalledTimes(1);
    });

    it.each([
      [
        'noWallet',
        'No compatible wallet found. Install a Solana wallet that supports Mobile Wallet Adapter, then try again.',
      ],
      ['cancelled', 'Wallet authorization was cancelled.'],
      [
        'unreachable',
        "Couldn't reach your wallet. Open the wallet app and allow it to launch from other apps (background pop-ups), then try again.",
      ],
      ['unsupported', "Depositing from a wallet on this device isn't available here."],
    ] as const)('explains %s, and connects again on request', async (reason, message) => {
      const wallet = fakeWallet({ connects: [ok({ type: 'failed', reason }), CONNECTED] });
      await renderDeposit({ wallet });

      expect(await screen.findByText(message)).toBeTruthy();
      await user().press(screen.getByRole('button', { name: 'Connect wallet' }));

      expect(await screen.findByText('Connected: HN7cABqL…YWrH')).toBeTruthy();
      expect(wallet.connect).toHaveBeenCalledTimes(2);
    });

    it('says so when the answer could not be read', async () => {
      await renderDeposit({ wallet: fakeWallet({ connects: [err(offline())] }) });

      expect(await screen.findByText("Couldn't connect to your wallet. Try again.")).toBeTruthy();
    });
  });

  describe('the amount', () => {
    it('shows what the connected wallet holds of the token', async () => {
      await renderDeposit();

      expect(await screen.findByText('USDC in this wallet: $125.50')).toBeTruthy();
    });

    it('says the balance is unavailable rather than showing nothing in it', async () => {
      await renderDeposit({ network: fakeNetwork(err(offline())) });

      expect(await screen.findByText('Balance unavailable')).toBeTruthy();
      expect(screen.queryByText(/in this wallet: \$0\.00/)).toBeNull();
    });

    it('keeps Deposit off until an amount is typed', async () => {
      await renderDeposit();

      await screen.findByText('USDC in this wallet: $125.50');
      expect(screen.getByRole('button', { name: 'Deposit' })).toBeDisabled();
    });

    it('refuses more than the wallet holds', async () => {
      await renderDeposit();
      await screen.findByText('USDC in this wallet: $125.50');

      await typeAmount(user(), ['2', '0', '0']);

      expect(screen.getByText("That's more than your wallet holds.")).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Deposit' })).toBeDisabled();
    });

    it('lets a deposit through when the balance could not be read', async () => {
      await renderDeposit({ network: fakeNetwork(err(offline())) });
      await screen.findByText('Balance unavailable');

      await typeAmount(user(), ['2', '0', '0']);

      expect(screen.getByRole('button', { name: 'Deposit' })).toBeEnabled();
    });

    it('offers only USDC on devnet', async () => {
      await renderDeposit();
      await screen.findByText('USDC in this wallet: $125.50');

      expect(screen.queryByRole('button', { name: /^Token/ })).toBeNull();
    });
  });

  describe('depositing', () => {
    it('hands the wallet exactly the typed amount of the token, from the connected wallet, to the Circle wallet', async () => {
      const wallet = await renderDeposit();
      await screen.findByText('USDC in this wallet: $125.50');
      const actor = user();

      await typeAmount(actor, ['1', '2', '.', '3', '4']);
      await actor.press(screen.getByRole('button', { name: 'Deposit' }));

      await waitFor(() => {
        expect(wallet.sent).toEqual([
          {
            account: ACCOUNT,
            transfer: {
              token: {
                symbol: 'USDC',
                mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
                decimals: 6,
              },
              source: WALLET,
              destination: CIRCLE,
              amount: 12_340_000n,
            },
            blockhash: BLOCKHASH,
          },
        ]);
      });
    });

    it('deposits USDT at its mainnet mint when chosen on a mainnet build', async () => {
      const wallet = await renderDeposit({ cluster: 'mainnet-beta' });
      await screen.findByText('USDC in this wallet: $125.50');
      const actor = user();

      await actor.press(screen.getByRole('button', { name: 'Token, USDC' }));
      await actor.press(await screen.findByText('USDT'));
      await typeAmount(actor, ['5']);
      await actor.press(screen.getByRole('button', { name: 'Deposit' }));

      await waitFor(() => {
        expect(wallet.sent[0]?.transfer.token.mint).toBe(
          'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        );
      });
      expect(wallet.sent[0]?.transfer.amount).toBe(5_000_000n);
    });

    it('lands on the result as the only page, carrying the amount, token and signature — never the authorisation', async () => {
      await renderDeposit();
      await screen.findByText('USDC in this wallet: $125.50');
      const actor = user();

      await typeAmount(actor, ['7']);
      await actor.press(screen.getByRole('button', { name: 'Deposit' }));

      expect(
        await screen.findByText(
          `result ${JSON.stringify({ amountMinor: 700, tokenSymbol: 'USDC', signature: SIGNATURE })}`,
        ),
      ).toBeTruthy();
      expect(screen.queryByText(new RegExp(AUTH_TOKEN))).toBeNull();
      expect(screen.queryByRole('button', { name: 'Deposit' })).toBeNull();
    });

    it('lands on the result without a signature when the wallet cannot be heard from', async () => {
      await renderDeposit({
        wallet: fakeWallet({ answer: () => Promise.resolve(ok({ type: 'unconfirmed' })) }),
      });
      await screen.findByText('USDC in this wallet: $125.50');
      const actor = user();

      await typeAmount(actor, ['7']);
      await actor.press(screen.getByRole('button', { name: 'Deposit' }));

      expect(await screen.findByText(/"signature":null/)).toBeTruthy();
    });

    it('asks the wallet once, however often Deposit is pressed', async () => {
      let release: () => void = () => undefined;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      const wallet = await renderDeposit({
        wallet: fakeWallet({
          answer: async () => {
            await held;
            return ok({ type: 'submitted', signature: SIGNATURE });
          },
        }),
      });
      await screen.findByText('USDC in this wallet: $125.50');
      const actor = user();
      await typeAmount(actor, ['7']);

      const deposit = screen.getByRole('button', { name: 'Deposit' });
      await actor.press(deposit);
      await actor.press(deposit);
      await act(async () => {
        release();
        await held;
      });

      await screen.findByText(/^result /);
      expect(wallet.sent).toHaveLength(1);
    });

    it('offers no way back while the wallet is signing', async () => {
      let release: () => void = () => undefined;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      await renderDeposit({
        wallet: fakeWallet({
          answer: async () => {
            await held;
            return ok({ type: 'notSent', reason: 'declined' });
          },
        }),
      });
      await screen.findByText('USDC in this wallet: $125.50');
      const actor = user();
      expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();

      await typeAmount(actor, ['7']);
      await actor.press(screen.getByRole('button', { name: 'Deposit' }));

      expect(await screen.findByText('Waiting for wallet approval…')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();

      await act(async () => {
        release();
        await held;
      });
      expect(await screen.findByRole('button', { name: 'Back' })).toBeTruthy();
    });

    it.each([
      ['declined', 'The deposit was not approved in your wallet.'],
      [
        'notSubmitted',
        "Your wallet didn't send the deposit. Check you hold enough USDC and a little SOL for the network fee, then try again.",
      ],
      ['noDestination', "Your Owego wallet isn't ready to receive yet."],
    ] as const)('stays, saying why, when the deposit was %s', async (reason, message) => {
      await renderDeposit({
        wallet: fakeWallet({ answer: () => Promise.resolve(ok({ type: 'notSent', reason })) }),
      });
      await screen.findByText('USDC in this wallet: $125.50');
      const actor = user();

      await typeAmount(actor, ['7']);
      await actor.press(screen.getByRole('button', { name: 'Deposit' }));

      expect(await screen.findByText(message)).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Deposit' })).toBeEnabled();
    });

    it('asks to connect again when the wallet no longer honours the authorisation', async () => {
      const wallet = fakeWallet({
        answer: () => Promise.resolve(ok({ type: 'notSent', reason: 'authorizationExpired' })),
      });
      await renderDeposit({ wallet });
      await screen.findByText('USDC in this wallet: $125.50');
      const actor = user();

      await typeAmount(actor, ['7']);
      await actor.press(screen.getByRole('button', { name: 'Deposit' }));

      expect(
        await screen.findByText('Your wallet needs to be connected again before you deposit.'),
      ).toBeTruthy();
      await actor.press(screen.getByRole('button', { name: 'Connect wallet' }));
      expect(wallet.connect).toHaveBeenCalledTimes(2);
    });

    it('says nothing left the wallet when the deposit could not start', async () => {
      await renderDeposit({
        wallet: fakeWallet({ answer: () => Promise.resolve(err(offline())) }),
      });
      await screen.findByText('USDC in this wallet: $125.50');
      const actor = user();

      await typeAmount(actor, ['7']);
      await actor.press(screen.getByRole('button', { name: 'Deposit' }));

      expect(
        await screen.findByText(
          "Couldn't start the deposit, and nothing left your wallet. Try again.",
        ),
      ).toBeTruthy();
    });

    it('refreshes balances and history once money may have moved', async () => {
      const queryClient = watchedQueryClient();
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      await renderDeposit({ queryClient });
      await screen.findByText('USDC in this wallet: $125.50');
      const actor = user();

      await typeAmount(actor, ['7']);
      await actor.press(screen.getByRole('button', { name: 'Deposit' }));

      await screen.findByText(/^result /);
      expect(invalidate).toHaveBeenCalledWith();
    });

    it('never writes the authorisation to the keychain', async () => {
      await renderDeposit();
      await screen.findByText('USDC in this wallet: $125.50');
      const actor = user();

      await typeAmount(actor, ['7']);
      await actor.press(screen.getByRole('button', { name: 'Deposit' }));
      await screen.findByText(/^result /);

      expect(JSON.stringify(jest.mocked(setGenericPassword).mock.calls)).not.toContain(AUTH_TOKEN);
    });
  });
});
