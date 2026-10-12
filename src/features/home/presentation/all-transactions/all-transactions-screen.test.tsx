import { isValidElement } from 'react';
import { Text, type RefreshControlProps } from 'react-native';
import { NavigationContainer, useRoute, type RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { act, fireEvent, screen, userEvent, waitFor, within } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { lightTheme } from '@/core/design-system';
import { offline } from '@/core/errors/app-error';
import type { AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import { ancestorsOf } from '@/test/ancestors-of';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type { Transaction } from '../../domain/entity/home-entity';
import type { TransactionSlice } from '../../domain/entity/transaction-page';
import type { TransactionHistoryRepository } from '../../domain/repository/home-repository';
import { AllTransactionsScreen } from './all-transactions-screen';

jest.useFakeTimers();

function transaction(id: string, overrides: Partial<Transaction> = {}): Transaction {
  return {
    id,
    status: 'completed',
    direction: 'incoming',
    amountMinor: 5000,
    currency: 'USD',
    narration: '',
    createdAt: '2026-09-21T10:00:00Z',
    title: `Deposit ${id}`,
    ...overrides,
  };
}

function deposits(count: number, from = 1): Transaction[] {
  return Array.from({ length: count }, (_, index) => transaction(`d${String(from + index)}`));
}

type Answer = Result<TransactionSlice, AppError>;

function historyOf(
  pages: Record<number, Answer | (() => Promise<Answer>)>,
): TransactionHistoryRepository & { getPage: jest.Mock } {
  return {
    getPage: jest.fn((page: number) => {
      const answer = pages[page] ?? ok({ transactions: [], total: 0, pageSize: 20 });

      return typeof answer === 'function' ? answer() : Promise.resolve(answer);
    }),
  };
}

const Stack = createNativeStackNavigator();

function Dashboard() {
  return <Text>Dashboard</Text>;
}

function ReceiptProbe() {
  const { transactionId } =
    useRoute<RouteProp<{ TransactionDetails: { transactionId: string } }>>().params;

  return <Text>{`Receipt for ${transactionId}`}</Text>;
}

function TestApp() {
  return (
    <NavigationContainer
      initialState={{ index: 1, routes: [{ name: 'Dashboard' }, { name: 'AllTransactions' }] }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Dashboard" component={Dashboard} />
        <Stack.Screen name="AllTransactions" component={AllTransactionsScreen} />
        <Stack.Screen name="TransactionDetails" component={ReceiptProbe} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function renderHistory(repository: TransactionHistoryRepository) {
  return renderWithProviders(<TestApp />, {
    container: createTestContainer({ transactionHistoryRepository: asValue(repository) }),
  });
}

type TreeNode = Parameters<typeof ancestorsOf>[0];

function listAround(row: TreeNode) {
  const list = ancestorsOf(row).find((node) => node.props['refreshControl'] !== undefined);
  if (list === undefined) throw new Error('The history is not in a refreshable list');

  return list;
}

function refreshControlOf(row: TreeNode): RefreshControlProps {
  const control = listAround(row).props['refreshControl'];
  if (!isValidElement<RefreshControlProps>(control)) throw new Error('No refresh control');

  return control.props;
}

async function scrollTo(y: number) {
  await fireEvent.scroll(screen.getByTestId('transaction-history'), {
    nativeEvent: {
      contentOffset: { x: 0, y },
      contentSize: { width: 400, height: 6000 },
      layoutMeasurement: { width: 400, height: 900 },
    },
  });
}

function scrollToEnd() {
  return scrollTo(5000);
}

describe('AllTransactionsScreen', () => {
  describe('the header', () => {
    it('names the page', async () => {
      await renderHistory(historyOf({ 1: ok({ transactions: [], total: 0, pageSize: 20 }) }));

      expect(await screen.findByRole('header', { name: 'All transactions' })).toBeOnTheScreen();
    });

    it('goes back to where it was opened from', async () => {
      const user = userEvent.setup();
      await renderHistory(historyOf({ 1: ok({ transactions: [], total: 0, pageSize: 20 }) }));

      await user.press(await screen.findByRole('button', { name: 'Back' }));

      expect(await screen.findByText('Dashboard')).toBeOnTheScreen();
    });

    it('stays in place while the history scrolls', async () => {
      await renderHistory(
        historyOf({ 1: ok({ transactions: deposits(3), total: 3, pageSize: 20 }) }),
      );

      const list = listAround(await screen.findByRole('button', { name: /Deposit d1/ }));

      expect(ancestorsOf(screen.getByRole('button', { name: 'Back' }))).not.toContain(list);
      expect(ancestorsOf(screen.getByRole('header', { name: 'All transactions' }))).not.toContain(
        list,
      );
    });
  });

  describe('the rows', () => {
    it('reads each transaction with its signed amount', async () => {
      await renderHistory(
        historyOf({
          1: ok({
            transactions: [
              transaction('t1', { title: 'Deposit from 0xlo...98hj', amountMinor: 5000 }),
              transaction('t2', {
                title: 'Transfer to Joseph',
                direction: 'outgoing',
                amountMinor: 1250,
              }),
            ],
            total: 2,
            pageSize: 20,
          }),
        }),
      );

      expect(
        await screen.findByRole('button', { name: /^Deposit from 0xlo\.\.\.98hj, \+\$50\.00, / }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: /^Transfer to Joseph, -\$12\.50, / }),
      ).toBeOnTheScreen();
    });

    it('opens the receipt for the row tapped', async () => {
      const user = userEvent.setup();
      await renderHistory(
        historyOf({ 1: ok({ transactions: deposits(3), total: 3, pageSize: 20 }) }),
      );

      await user.press(await screen.findByRole('button', { name: /Deposit d2/ }));

      expect(await screen.findByText('Receipt for d2')).toBeOnTheScreen();
    });
  });

  describe('the day headings', () => {
    beforeEach(() => {
      jest.setSystemTime(new Date('2026-10-09T12:00:00Z'));
    });

    function expectHeadings(...names: string[]) {
      expect(screen.getAllByRole('header')).toEqual(
        names.map((name) => screen.getByRole('header', { name })),
      );
    }

    it('heads each day’s rows with the day they happened', async () => {
      await renderHistory(
        historyOf({
          1: ok({
            transactions: [
              transaction('t1', { createdAt: '2026-10-09T09:05:00Z' }),
              transaction('t2', { createdAt: '2026-10-08T18:42:00Z' }),
              transaction('t3', { createdAt: '2026-10-03T23:17:00Z' }),
            ],
            total: 3,
            pageSize: 20,
          }),
        }),
      );

      await screen.findByRole('button', { name: /Deposit t1/ });

      expectHeadings('All transactions', 'Today', 'Yesterday', 'Oct 3, 2026');
    });

    it('keeps one heading over a day that runs on into the next page', async () => {
      const today = (count: number, from = 1) =>
        Array.from({ length: count }, (_, index) =>
          transaction(`d${String(from + index)}`, { createdAt: '2026-10-09T09:05:00Z' }),
        );
      await renderHistory(
        historyOf({
          1: ok({ transactions: today(20), total: 25, pageSize: 20 }),
          2: ok({ transactions: today(5, 21), total: 25, pageSize: 20 }),
        }),
      );
      await screen.findByRole('button', { name: /Deposit d1,/ });

      await scrollToEnd();
      await screen.findByRole('button', { name: /Deposit d25/ });

      expectHeadings('All transactions', 'Today');
    });
  });

  describe('the amounts', () => {
    it('draws money added in green, money out in the primary ink, and a failed payment in red', async () => {
      await renderHistory(
        historyOf({
          1: ok({
            transactions: [
              transaction('t1', { amountMinor: 5000 }),
              transaction('t2', { direction: 'outgoing', amountMinor: 1250 }),
              transaction('t3', { direction: 'outgoing', status: 'failed', amountMinor: 700 }),
            ],
            total: 3,
            pageSize: 20,
          }),
        }),
      );

      expect(await screen.findByText('+$50.00')).toHaveStyle({
        color: lightTheme.color.textSuccess,
      });
      expect(screen.getByText('-$12.50')).toHaveStyle({ color: lightTheme.color.textPrimary });
      expect(screen.getByText('-$7.00')).toHaveStyle({ color: lightTheme.color.textError });
    });
  });

  describe('before the first page', () => {
    it('holds a row’s place for each row it is waiting for', async () => {
      await renderHistory(historyOf({ 1: () => new Promise<Answer>(() => undefined) }));

      const loading = await screen.findByTestId('transactions-loading', {
        includeHiddenElements: true,
      });

      expect(
        within(loading).getAllByTestId('transaction-row-placeholder', {
          includeHiddenElements: true,
        }),
      ).toHaveLength(6);
    });

    it('says so when there is no history yet', async () => {
      await renderHistory(historyOf({ 1: ok({ transactions: [], total: 0, pageSize: 20 }) }));

      expect(await screen.findByText('No transactions yet')).toBeOnTheScreen();
    });

    it('offers another go when the first page cannot be read', async () => {
      const user = userEvent.setup();
      const repository = historyOf({ 1: err(offline()) });
      await renderHistory(repository);

      expect(await screen.findByText('We could not load your transactions.')).toBeOnTheScreen();

      repository.getPage.mockImplementation(() =>
        Promise.resolve(ok({ transactions: deposits(1), total: 1, pageSize: 20 })),
      );
      await user.press(screen.getByRole('button', { name: 'Try again' }));

      expect(await screen.findByRole('button', { name: /Deposit d1/ })).toBeOnTheScreen();
    });
  });

  describe('paging', () => {
    it('asks for the next page near the end, and adds it below', async () => {
      const repository = historyOf({
        1: ok({ transactions: deposits(20), total: 25, pageSize: 20 }),
        2: ok({ transactions: deposits(5, 21), total: 25, pageSize: 20 }),
      });
      await renderHistory(repository);
      await screen.findByRole('button', { name: /Deposit d1,/ });

      await scrollToEnd();

      await waitFor(() => {
        expect(repository.getPage).toHaveBeenCalledWith(2, 20);
      });
      expect(await screen.findByRole('button', { name: /Deposit d25/ })).toBeOnTheScreen();
    });

    it('opens the receipt for a row from a later page', async () => {
      const user = userEvent.setup();
      await renderHistory(
        historyOf({
          1: ok({ transactions: deposits(20), total: 21, pageSize: 20 }),
          2: ok({ transactions: deposits(1, 21), total: 21, pageSize: 20 }),
        }),
      );
      await screen.findByRole('button', { name: /Deposit d1,/ });

      await scrollToEnd();
      await user.press(await screen.findByRole('button', { name: /Deposit d21/ }));

      expect(await screen.findByText('Receipt for d21')).toBeOnTheScreen();
    });

    it('holds the next rows’ place while the next page loads', async () => {
      await renderHistory(
        historyOf({
          1: ok({ transactions: deposits(20), total: 25, pageSize: 20 }),
          2: () => new Promise<Answer>(() => undefined),
        }),
      );
      await screen.findByRole('button', { name: /Deposit d1,/ });

      await scrollToEnd();

      expect(
        await screen.findAllByTestId('transaction-row-placeholder', {
          includeHiddenElements: true,
        }),
      ).toHaveLength(2);
    });

    it('asks for nothing past the last page', async () => {
      const repository = historyOf({
        1: ok({ transactions: deposits(3), total: 3, pageSize: 20 }),
      });
      await renderHistory(repository);
      await screen.findByRole('button', { name: /Deposit d1,/ });

      await scrollToEnd();
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });

      expect(repository.getPage).toHaveBeenCalledTimes(1);
    });

    it('keeps what it has when the next page fails, and offers another go', async () => {
      const user = userEvent.setup();
      const repository = historyOf({
        1: ok({ transactions: deposits(20), total: 25, pageSize: 20 }),
        2: err(offline()),
      });
      await renderHistory(repository);
      await screen.findByRole('button', { name: /Deposit d1,/ });

      await scrollToEnd();

      expect(await screen.findByText('We could not load more transactions.')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: /Deposit d20,/ })).toBeOnTheScreen();

      const attempts = repository.getPage.mock.calls.length;
      await scrollTo(0);
      await scrollToEnd();
      expect(repository.getPage).toHaveBeenCalledTimes(attempts);

      repository.getPage.mockImplementation((page: number) =>
        Promise.resolve(
          page === 2
            ? ok({ transactions: deposits(5, 21), total: 25, pageSize: 20 })
            : ok({ transactions: deposits(20), total: 25, pageSize: 20 }),
        ),
      );
      await user.press(screen.getByRole('button', { name: 'Retry' }));

      expect(await screen.findByRole('button', { name: /Deposit d25/ })).toBeOnTheScreen();
      expect(screen.queryByText('We could not load more transactions.')).toBeNull();
    });

    it('refreshes from the first page alone', async () => {
      const repository = historyOf({
        1: ok({ transactions: deposits(20), total: 25, pageSize: 20 }),
        2: ok({ transactions: deposits(5, 21), total: 25, pageSize: 20 }),
      });
      await renderHistory(repository);
      await screen.findByRole('button', { name: /Deposit d1,/ });
      await scrollToEnd();
      const row = await screen.findByRole('button', { name: /Deposit d25/ });
      await scrollTo(0);
      repository.getPage.mockClear();

      await act(async () => {
        refreshControlOf(row).onRefresh?.();
        await jest.runOnlyPendingTimersAsync();
      });

      expect(repository.getPage).toHaveBeenCalledTimes(1);
      expect(repository.getPage).toHaveBeenCalledWith(1, 20);
    });
  });
});
