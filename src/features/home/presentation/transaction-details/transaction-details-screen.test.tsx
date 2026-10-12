import { AccessibilityInfo, Linking, Share, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { act, screen, userEvent, waitFor } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { asValue } from 'awilix';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { typography } from '@/core/design-system';
import { offline } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { AppError } from '@/core/errors/app-error';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type { TransactionDetail } from '../../domain/entity/transaction-detail';
import type { TransactionDetailRepository } from '../../domain/repository/home-repository';
import { TransactionDetailsScreen } from './transaction-details-screen';

jest.useFakeTimers();

const SIGNATURE =
  '4xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1';
const WALLET = 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx2';

const PAYOUT: TransactionDetail = {
  id: '00000000-0000-4000-8000-000000000007',
  status: 'successful',
  direction: 'outgoing',
  kind: 'payout',
  amount: { minor: 1500, currency: 'USD' },
  localAmount: { minor: 1115, currency: 'GBP' },
  rate: 0.7433,
  fee: { minor: 25, currency: 'USD' },
  narration: 'For goods and services',
  createdAt: '2024-03-15T14:45:00Z',
  counterparty: {
    kind: 'bank',
    name: 'Hannah Nuggest',
    bankName: 'Barclays',
    accountNumber: '01235780381',
    countryCode: 'GB',
  },
  signature: SIGNATURE,
};

const SEND: TransactionDetail = {
  ...PAYOUT,
  id: 's1',
  kind: 'send',
  amount: { minor: 15_000, currency: 'USD' },
  localAmount: undefined,
  rate: undefined,
  fee: undefined,
  narration: undefined,
  counterparty: { kind: 'wallet', address: WALLET, network: 'SOL' },
};

const RECEIVED: TransactionDetail = {
  ...SEND,
  id: 'r1',
  direction: 'incoming',
  kind: 'receive',
  amount: { minor: 70_000, currency: 'USD' },
};

const Stack = createNativeStackNavigator();

function Dashboard() {
  return <Text>Dashboard</Text>;
}

function TestApp({ transactionId }: { transactionId: string }) {
  return (
    <NavigationContainer
      initialState={{
        index: 1,
        routes: [{ name: 'Dashboard' }, { name: 'TransactionDetails', params: { transactionId } }],
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Dashboard" component={Dashboard} />
        <Stack.Screen name="TransactionDetails" component={TransactionDetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function repositoryAnswering(
  answer: () => Promise<Result<TransactionDetail, AppError>>,
): TransactionDetailRepository & { getById: jest.Mock } {
  return { getById: jest.fn(answer) };
}

function renderDetails(
  repository: TransactionDetailRepository,
  transactionId = '00000000-0000-4000-8000-000000000007',
) {
  return renderWithProviders(<TestApp transactionId={transactionId} />, {
    container: createTestContainer({ transactionDetailRepository: asValue(repository) }),
  });
}

function showing(detail: TransactionDetail) {
  return repositoryAnswering(() => Promise.resolve(ok(detail)));
}

function positionOf(text: string): number {
  return JSON.stringify(screen.toJSON()).indexOf(text);
}

let openUrl: jest.SpyInstance;
let share: jest.SpyInstance;
let announce: jest.SpyInstance;

beforeEach(() => {
  jest.mocked(InAppBrowser.isAvailable).mockResolvedValue(true);
  jest.mocked(InAppBrowser.open).mockClear();
  jest.mocked(Clipboard.setString).mockClear();
  openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation();
});

afterEach(() => {
  openUrl.mockRestore();
  share.mockRestore();
  announce.mockRestore();
});

describe('TransactionDetailsScreen', () => {
  it('reads the transaction it was opened for', async () => {
    const repository = showing(PAYOUT);
    await renderDetails(repository, 't2');

    await screen.findByText('Transaction Details');
    expect(repository.getById).toHaveBeenCalledWith('t2');
  });

  it('closes back to where it was opened from', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderDetails(showing(PAYOUT));

    await user.press(await screen.findByRole('button', { name: 'Close' }));

    expect(await screen.findByText('Dashboard')).toBeOnTheScreen();
  });

  describe('a bank payout', () => {
    it('leads with the amount sent and where it stands', async () => {
      await renderDetails(showing(PAYOUT));

      expect(await screen.findByLabelText('Amount Sent, $15')).toBeOnTheScreen();
      expect(screen.getByText('Successful')).toBeOnTheScreen();
      expect(screen.queryByText('£11.15')).toBeNull();
    });

    it('names who was paid, and where', async () => {
      await renderDetails(showing(PAYOUT));

      expect(
        await screen.findByLabelText('To, Hannah Nuggest, Barclays · 01235780381'),
      ).toBeOnTheScreen();
      expect(screen.getByText('HN')).toBeOnTheScreen();
    });

    it('itemises what the payload carries, dated first', async () => {
      await renderDetails(showing(PAYOUT));

      expect(await screen.findByLabelText('Date & time, 03/15/2024 at 02:45 PM')).toBeOnTheScreen();
      expect(screen.getByLabelText('Total amount paid, $15.00')).toBeOnTheScreen();
      expect(screen.getByText(' (£11.15)')).toBeOnTheScreen();
      expect(screen.getByLabelText('Fee, $0.25')).toBeOnTheScreen();
      expect(screen.getByLabelText('Rate, $1 = £0.74')).toBeOnTheScreen();
      expect(screen.getByLabelText('Narration, For goods and services')).toBeOnTheScreen();
      expect(screen.getByLabelText('Transaction type, Debit')).toBeOnTheScreen();
      expect(
        screen.getByLabelText('Transaction ID, 00000000-0000-4000-8000-000000000007'),
      ).toBeOnTheScreen();

      expect(positionOf('Date & time')).toBeLessThan(positionOf('Total amount paid'));
      expect(positionOf('Transaction type')).toBeLessThan(positionOf('Transaction ID'));
    });

    it('shows no row it would have to invent', async () => {
      await renderDetails(showing(PAYOUT));

      await screen.findByLabelText('Amount Sent, $15');
      expect(screen.queryByText('Recipient got')).toBeNull();
      expect(screen.queryByLabelText('From, Wallet')).toBeNull();
    });

    it('shares a receipt rather than linking to the chain', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      await renderDetails(showing(PAYOUT));

      await user.press(await screen.findByRole('button', { name: 'Share receipt' }));

      expect(screen.queryByRole('button', { name: 'View on Solscan' })).toBeNull();
      expect(share).toHaveBeenCalledTimes(1);
      const [{ message }] = share.mock.calls[0] as [{ message: string }];
      expect(message).toContain('$15.00 (£11.15)');
      expect(message).toContain('Hannah Nuggest · Barclays · 01235780381');
      expect(message).toContain('00000000-0000-4000-8000-000000000007');
    });
  });

  describe('a wallet send', () => {
    it('reads as sent from the wallet, to the address', async () => {
      await renderDetails(showing(SEND));

      expect(await screen.findByLabelText('Amount Sent, $150')).toBeOnTheScreen();
      expect(screen.getByText(WALLET)).toHaveProp('numberOfLines', 1);
      expect(screen.getByLabelText('Total amount paid, $150.00')).toBeOnTheScreen();
      expect(screen.getByLabelText('From, Wallet')).toBeOnTheScreen();
      expect(screen.queryByLabelText(/^Transaction type,/)).toBeNull();
    });

    it('opens the transaction on Solscan, on the build’s own cluster', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      await renderDetails(showing(SEND));

      await user.press(await screen.findByRole('button', { name: 'View on Solscan' }));

      await waitFor(() => {
        expect(InAppBrowser.open).toHaveBeenCalledWith(
          `https://solscan.io/tx/${SIGNATURE}?cluster=devnet`,
        );
      });
      expect(screen.queryByRole('button', { name: 'Share receipt' })).toBeNull();
    });

    it('leaves Report on its own without a signature', async () => {
      await renderDetails(showing({ ...SEND, signature: undefined }));

      expect(await screen.findByRole('button', { name: 'Report' })).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'View on Solscan' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Share receipt' })).toBeNull();
    });

    it('leaves Report on its own when the send failed', async () => {
      await renderDetails(showing({ ...SEND, status: 'failed' }));

      expect(await screen.findByRole('button', { name: 'Report' })).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'View on Solscan' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Share receipt' })).toBeNull();
    });
  });

  describe('money received', () => {
    it('reads as received, into the wallet, from the sender', async () => {
      await renderDetails(showing(RECEIVED));

      expect(await screen.findByLabelText('Amount Received, $700')).toBeOnTheScreen();
      expect(screen.getByLabelText('Amount, $700.00')).toBeOnTheScreen();
      expect(screen.getByLabelText('To, Wallet')).toBeOnTheScreen();
      expect(screen.getByLabelText(`From, ${WALLET}, Solana`)).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'View on Solscan' })).toBeOnTheScreen();
    });

    it('shows no fee, rate or narration it was never sent', async () => {
      await renderDetails(showing(RECEIVED));

      await screen.findByLabelText('Amount Received, $700');
      expect(screen.queryByLabelText(/^Fee,/)).toBeNull();
      expect(screen.queryByLabelText(/^Rate,/)).toBeNull();
      expect(screen.queryByLabelText(/^Narration,/)).toBeNull();
    });
  });

  describe('the transaction id', () => {
    it('copies on request and acknowledges it', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      await renderDetails(showing(PAYOUT));

      await user.press(await screen.findByRole('button', { name: 'Copy transaction ID' }));

      expect(Clipboard.setString).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000007');
      expect(screen.getByRole('button', { name: 'Transaction ID copied' })).toBeOnTheScreen();
      expect(announce).toHaveBeenCalledWith('Transaction ID copied');
    });

    it('is never copied unasked', async () => {
      await renderDetails(showing(PAYOUT));

      await screen.findByLabelText('Amount Sent, $15');
      expect(Clipboard.setString).not.toHaveBeenCalled();
    });
  });

  it('names a payee known only by account number by that number', async () => {
    await renderDetails(
      showing({
        ...PAYOUT,
        counterparty: {
          kind: 'bank',
          name: '',
          bankName: 'Access Bank',
          accountNumber: '0040295357',
          countryCode: 'NG',
        },
      }),
    );

    expect(await screen.findByLabelText('To, 0040295357, Access Bank')).toBeOnTheScreen();
    expect(screen.queryByText('HN')).toBeNull();
  });

  it('names a wallet on a chain it does not know by its address alone', async () => {
    await renderDetails(
      showing({ ...RECEIVED, counterparty: { kind: 'wallet', address: WALLET, network: '' } }),
    );

    expect(await screen.findByLabelText(`From, ${WALLET}`)).toBeOnTheScreen();
  });

  it('leaves the payee card out when the payload names nobody', async () => {
    await renderDetails(showing({ ...RECEIVED, counterparty: undefined }));

    await screen.findByLabelText('Amount Received, $700');
    expect(screen.queryByLabelText(/^From,/)).toBeNull();
  });

  describe('status', () => {
    it.each([
      ['processing', 'Processing'],
      ['pending', 'Pending'],
      ['failed', 'Failed'],
      ['cancelled', 'Cancelled'],
    ] as const)('names a %s transaction as such', async (status, label) => {
      await renderDetails(showing({ ...PAYOUT, status }));

      expect(await screen.findByText(label)).toBeOnTheScreen();
    });

    it('draws the status as the receipt’s standalone pill', async () => {
      await renderDetails(showing(PAYOUT));

      expect(await screen.findByText('Successful')).toHaveStyle({
        fontSize: typography['body.mEmphasis'].fontSize,
      });
    });
  });

  it('sets the breakdown at the receipt size', async () => {
    await renderDetails(showing(PAYOUT));

    expect(await screen.findByText('Date & time')).toHaveStyle({
      fontSize: typography['body.m'].fontSize,
    });
    expect(screen.getByText('03/15/2024 at 02:45 PM')).toHaveStyle({
      fontSize: typography['body.mEmphasis'].fontSize,
    });
    expect(screen.getByText('00000000-0000-4000-8000-000000000007')).toHaveStyle({
      fontSize: typography['body.mEmphasis'].fontSize,
    });
  });

  it('reports a problem to support', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderDetails(showing(PAYOUT));

    await user.press(await screen.findByRole('button', { name: 'Report' }));

    expect(openUrl).toHaveBeenCalledWith(expect.stringMatching(/^mailto:support@ribhfinance\.com/));
  });

  describe('while loading', () => {
    it('shows placeholders and no figure', async () => {
      await renderDetails(repositoryAnswering(() => new Promise(() => undefined)));

      expect(
        await screen.findByTestId('transaction-loading', { includeHiddenElements: true }),
      ).toBeOnTheScreen();
      expect(screen.queryByLabelText(/^Amount Sent/)).toBeNull();
      expect(screen.queryByRole('button', { name: 'View on Solscan' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Share receipt' })).toBeNull();
    });

    it('holds the actions back until it knows which apply', async () => {
      let answer: (result: Result<TransactionDetail, AppError>) => void = () => undefined;
      await renderDetails(
        repositoryAnswering(
          () =>
            new Promise((resolve) => {
              answer = resolve;
            }),
        ),
      );

      await screen.findByTestId('transaction-loading', { includeHiddenElements: true });
      expect(screen.queryByRole('button', { name: 'Report' })).toBeNull();

      await act(async () => {
        answer(ok(SEND));
        await Promise.resolve();
      });

      expect(await screen.findByRole('button', { name: 'View on Solscan' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Report' })).toBeOnTheScreen();
    });
  });

  describe('when it cannot be read', () => {
    it('says so and offers another go', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const repository = repositoryAnswering(() => Promise.resolve(err(offline())));
      await renderDetails(repository);

      expect(await screen.findByText('We could not load this transaction.')).toBeOnTheScreen();
      repository.getById.mockImplementation(() => Promise.resolve(ok(PAYOUT)));

      await user.press(screen.getByRole('button', { name: 'Retry' }));

      expect(await screen.findByLabelText('Amount Sent, $15')).toBeOnTheScreen();
      expect(repository.getById).toHaveBeenCalledTimes(2);
    });

    it('still offers a way to report it', async () => {
      await renderDetails(repositoryAnswering(() => Promise.resolve(err(offline()))));

      await screen.findByText('We could not load this transaction.');
      expect(screen.getByRole('button', { name: 'Report' })).toBeOnTheScreen();
    });
  });
});
