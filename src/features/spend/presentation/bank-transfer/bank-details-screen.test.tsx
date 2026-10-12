import { NavigationContainer, useRoute, type RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { offline } from '@/core/errors/app-error';
import { err } from '@/core/result/result';
import { Text } from '@/shared/ui';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { createPreviewCorridorLookupRepository } from '../../data/repository/preview-corridor-lookup-repository';
import type { CorridorLookupRepository } from '../../domain/repository/corridor-lookup-repository';
import type { PayoutRecipient } from '../../domain/entity/payout-recipient';
import { BankDetailsScreen } from './bank-details-screen';
import { RecipientScreen } from './recipient-screen';
import type { BankTransferParamList } from './bank-transfer-param-list';

jest.useFakeTimers();

const PAGE_ONE: BankTransferParamList['BankDetails'] = {
  currency: 'USD',
  method: 'swift',
  fundingToken: 'USDT',
  origin: 'transfer',
  values: {
    category: 'individual',
    accountHolder: 'Hannah Nuggest',
    accountNumber: '01235780381',
  },
};

type Handoff = { recipient: PayoutRecipient; fundingToken: string };

const handoffs: Handoff[] = [];

function AmountProbe() {
  const params = useRoute<RouteProp<BankTransferParamList, 'Amount'>>().params;
  handoffs.push(params);

  return <Text accessibilityRole="header">{params.recipient.displayName}</Text>;
}

const Stack = createNativeStackNavigator<BankTransferParamList>();

function renderBankDetails(
  params: BankTransferParamList['BankDetails'] = PAGE_ONE,
  repository?: CorridorLookupRepository,
) {
  return renderWithProviders(
    <NavigationContainer
      initialState={{
        index: 1,
        routes: [{ name: 'Recipient' }, { name: 'BankDetails', params }],
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Recipient" component={RecipientScreen} />
        <Stack.Screen name="BankDetails" component={BankDetailsScreen} />
        <Stack.Screen name="Amount" component={AmountProbe} />
      </Stack.Navigator>
    </NavigationContainer>,
    {
      container: createTestContainer(
        repository === undefined ? {} : { corridorLookupRepository: asValue(repository) },
      ),
    },
  );
}

beforeEach(() => {
  handoffs.length = 0;
});

type User = ReturnType<typeof userEvent.setup>;

async function chooseCountry(user: User, name: string) {
  await user.press(await screen.findByRole('button', { name: 'Country' }));
  await user.press(await screen.findByRole('button', { name }));
}

async function fillRequired(user: User) {
  await user.type(await screen.findByLabelText('Bank name'), 'Barclays');
  await user.type(screen.getByLabelText('SWIFT code'), 'BARCGB22');
  await user.type(screen.getByLabelText('Street address'), '1 Churchill Place');
  await chooseCountry(user, 'United Kingdom');
  await user.type(screen.getByLabelText('City'), 'London');
  await user.type(screen.getByLabelText('Postal code'), 'E14 5HP');
}

describe('the page the corridor declares', () => {
  it('renders the second step of whichever corridor sent it here', async () => {
    await renderBankDetails();

    expect(await screen.findByRole('header', { name: 'Bank details' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Bank name')).toBeOnTheScreen();
    expect(screen.getByLabelText('SWIFT code')).toBeOnTheScreen();
    expect(screen.getByLabelText('Street address')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Country' })).toBeOnTheScreen();
    expect(screen.getByLabelText('City')).toBeOnTheScreen();
    expect(screen.getByLabelText('State')).toBeOnTheScreen();
    expect(screen.getByLabelText('Postal code')).toBeOnTheScreen();
  });

  it('does not ask again for what page one already collected', async () => {
    await renderBankDetails();

    await screen.findByLabelText('Bank name');

    expect(screen.queryByLabelText('Account holder')).not.toBeOnTheScreen();
    expect(screen.queryByLabelText('Account number')).not.toBeOnTheScreen();
  });

  it('offers no way forward until the page is filled', async () => {
    await renderBankDetails();

    expect(await screen.findByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});

describe('completing the page', () => {
  it('allows Continue once every required field is answered, optional ones aside', async () => {
    const user = userEvent.setup();
    await renderBankDetails();
    await fillRequired(user);

    expect(screen.getByLabelText('State')).toHaveDisplayValue('');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('keeps Continue disabled while only the optional field has been filled', async () => {
    const user = userEvent.setup();
    await renderBankDetails();

    await user.type(await screen.findByLabelText('State'), 'Greater London');

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('will not continue while a required select has not been chosen', async () => {
    const user = userEvent.setup();
    await renderBankDetails();

    await user.type(await screen.findByLabelText('Bank name'), 'Barclays');
    await user.type(screen.getByLabelText('Street address'), '1 Churchill Place');
    await user.type(screen.getByLabelText('City'), 'London');
    await user.type(screen.getByLabelText('Postal code'), 'E14 5HP');

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('does not accept a field of spaces as an answer', async () => {
    const user = userEvent.setup();
    await renderBankDetails();
    await fillRequired(user);

    await user.clear(screen.getByLabelText('City'));
    await user.type(screen.getByLabelText('City'), '   ');

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('takes the way forward away again when a required field is emptied', async () => {
    const user = userEvent.setup();
    await renderBankDetails();
    await fillRequired(user);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();

    await user.clear(screen.getByLabelText('Postal code'));

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});

describe('the picker behind a select', () => {
  it('titles itself after the field that opened it and lists what the source returned', async () => {
    const user = userEvent.setup();
    await renderBankDetails();

    await user.press(await screen.findByRole('button', { name: 'Country' }));

    expect(await screen.findByRole('button', { name: 'United Kingdom' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Nigeria' })).toBeOnTheScreen();
    expect(screen.getAllByText('Country').length).toBeGreaterThan(1);
  });

  it('fills the field with the choice and closes the sheet', async () => {
    const user = userEvent.setup();
    await renderBankDetails();

    await chooseCountry(user, 'United Kingdom');

    expect(screen.getByRole('button', { name: 'Country' })).toHaveAccessibilityValue({
      text: 'United Kingdom',
    });
    expect(screen.queryByRole('button', { name: 'Nigeria' })).not.toBeOnTheScreen();
  });

  it('shows the country already chosen as the selected row when reopened', async () => {
    const user = userEvent.setup();
    await renderBankDetails();

    await chooseCountry(user, 'United Kingdom');
    await user.press(screen.getByRole('button', { name: 'Country' }));

    expect(await screen.findByRole('button', { name: 'United Kingdom' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Nigeria' })).not.toBeSelected();
  });

  it('leaves the field as it was when the sheet is dismissed instead of chosen', async () => {
    const user = userEvent.setup();
    await renderBankDetails();

    await chooseCountry(user, 'United Kingdom');
    await user.press(screen.getByRole('button', { name: 'Country' }));
    await dismissSheet(user);

    expect(screen.queryByRole('button', { name: 'Nigeria' })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Country' })).toHaveAccessibilityValue({
      text: 'United Kingdom',
    });
  });

  it('says there is nothing to choose when the option source fails, and stays put', async () => {
    const user = userEvent.setup();
    const failing: CorridorLookupRepository = {
      ...createPreviewCorridorLookupRepository(),
      getOptions: () => Promise.resolve(err(offline())),
    };
    await renderBankDetails(PAGE_ONE, failing);

    await user.type(await screen.findByLabelText('Bank name'), 'Barclays');
    await user.type(screen.getByLabelText('Street address'), '1 Churchill Place');
    await user.type(screen.getByLabelText('City'), 'London');
    await user.type(screen.getByLabelText('Postal code'), 'E14 5HP');
    await user.press(screen.getByRole('button', { name: 'Country' }));

    expect(await screen.findByText('No items found')).toBeOnTheScreen();
    await dismissSheet(user);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});

describe('handing the recipient on', () => {
  it('carries both pages of answers, the rail and the funding token to the amount step', async () => {
    const user = userEvent.setup();
    await renderBankDetails();
    await fillRequired(user);

    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('header', { name: 'Hannah Nuggest' })).toBeOnTheScreen();
    expect(handoffs.at(-1)).toEqual({
      fundingToken: 'USDT',
      origin: 'transfer',
      recipient: {
        displayName: 'Hannah Nuggest',
        subtitle: '01235780381',
        currency: 'USD',
        method: 'swift',
        rail: 'zelle_transfer',
        endpoint: '/transaction/wallet-to-bank',
        requiresNarration: true,
        limits: [],
        countryCode: 'US',
        values: {
          category: 'individual',
          accountHolder: 'Hannah Nuggest',
          accountNumber: '01235780381',
          bankName: 'Barclays',
          swiftCode: 'BARCGB22',
          streetAddress: '1 Churchill Place',
          country: 'gb',
          city: 'London',
          postalCode: 'E14 5HP',
        },
        labels: { category: 'individual', country: 'United Kingdom' },
      },
    });
  });

  it('goes back to the recipient step rather than closing the flow', async () => {
    const user = userEvent.setup();
    await renderBankDetails();

    await user.press(await screen.findByRole('button', { name: 'Back' }));

    expect(await screen.findByRole('header', { name: 'Send' })).toBeOnTheScreen();
    expect(handoffs).toHaveLength(0);
  });
});

describe('params that name no second step', () => {
  it('asks for nothing and refuses to continue when no corridor matches', async () => {
    await renderBankDetails({ ...PAGE_ONE, currency: 'GBP' });

    expect(await screen.findByRole('header', { name: 'Bank details' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    expect(screen.queryByLabelText('Bank name')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Country' })).not.toBeOnTheScreen();
  });

  it('does the same for a corridor that has only one page', async () => {
    await renderBankDetails({ ...PAGE_ONE, currency: 'NGN', method: 'bank_transfer' });

    expect(await screen.findByRole('button', { name: 'Continue' })).toBeDisabled();
    expect(screen.queryByLabelText('Account number')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Bank name' })).not.toBeOnTheScreen();
  });
});

async function dismissSheet(user: User) {
  const sheetClose = screen.getAllByRole('button', { name: 'Close' }).at(-1);
  if (sheetClose === undefined) throw new Error('the open sheet offered no way out');

  await user.press(sheetClose);
}
