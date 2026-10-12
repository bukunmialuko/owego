import { NavigationContainer, useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { Text } from '@/shared/ui';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { createPreviewBeneficiaryRepository } from '../../data/repository/preview-beneficiary-repository';
import type { RecipientFields } from '../../domain/entity/beneficiary';
import type { BeneficiaryRepository } from '../../domain/repository/beneficiary-repository';
import { AddBankDetailsScreen } from './add-bank-details-screen';
import type { BeneficiariesParamList } from './beneficiaries-param-list';

jest.useFakeTimers();

const Stack = createNativeStackNavigator<BeneficiariesParamList>();

const landed: unknown[] = [];

function ListProbe() {
  landed.push(useRoute().params);

  return <Text accessibilityRole="header">List</Text>;
}

beforeEach(() => {
  landed.length = 0;
});

const PAGE_ONE: BeneficiariesParamList['AddBankDetails'] = {
  currency: 'USD',
  method: 'swift',
  values: { accountHolder: 'Hannah Nuggest', accountNumber: '99887766554' },
};

function renderDetails(
  params: BeneficiariesParamList['AddBankDetails'] = PAGE_ONE,
  repository: BeneficiaryRepository = createPreviewBeneficiaryRepository(),
) {
  return renderWithProviders(
    <NavigationContainer
      initialState={{
        index: 2,
        routes: [{ name: 'List' }, { name: 'AddBank' }, { name: 'AddBankDetails', params }],
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="List" component={ListProbe} />
        <Stack.Screen name="AddBank" component={ListProbe} />
        <Stack.Screen name="AddBankDetails" component={AddBankDetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
    { container: createTestContainer({ beneficiaryRepository: asValue(repository) }) },
  );
}

type User = ReturnType<typeof userEvent.setup>;

async function fillBankDetails(user: User) {
  await user.type(await screen.findByLabelText('Bank name'), 'Citi bank');
  await user.type(screen.getByLabelText('SWIFT code'), 'CITIGB2L');
  await user.type(screen.getByLabelText('Street address'), '33 Canada Square');
  await user.press(screen.getByRole('button', { name: 'Country' }));
  await user.press(await screen.findByRole('button', { name: 'United Kingdom' }));
  await user.type(screen.getByLabelText('City'), 'London');
  await user.type(screen.getByLabelText('Postal code'), 'E14 5LB');
}

describe('the bank details page', () => {
  it("asks for the bank, its SWIFT code and the beneficiary's address", async () => {
    await renderDetails();

    expect(await screen.findByRole('header', { name: 'Bank details' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Bank name')).toBeOnTheScreen();
    expect(screen.getByLabelText('SWIFT code')).toBeOnTheScreen();
    expect(screen.getByLabelText('Street address')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Country' })).toBeOnTheScreen();
    expect(screen.getByLabelText('City')).toBeOnTheScreen();
    expect(screen.getByLabelText('State')).toBeOnTheScreen();
    expect(screen.getByLabelText('Postal code')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Save beneficiary' })).toBeDisabled();
  });

  it('saves everything both pages collected and returns to the bank accounts tab', async () => {
    const user = userEvent.setup();
    const created: RecipientFields[] = [];
    const preview = createPreviewBeneficiaryRepository();
    await renderDetails(PAGE_ONE, {
      ...preview,
      create: (fields) => {
        created.push(fields);

        return preview.create(fields);
      },
    });

    await fillBankDetails(user);
    await user.press(screen.getByRole('button', { name: 'Save beneficiary' }));

    expect(await screen.findByRole('header', { name: 'List' })).toBeOnTheScreen();
    expect(landed.at(-1)).toEqual({ tab: 'bank' });
    expect(created).toEqual([
      {
        bankCountry: 'gb',
        bankName: 'Citi bank',
        bankCode: '',
        accountHolder: 'Hannah Nuggest',
        swiftNumber: 'CITIGB2L',
        accountNumber: '99887766554',
        paymentMethod: 'SWIFT',
        accountType: '',
        contact: {
          country: 'gb',
          state: '',
          city: 'London',
          address: '33 Canada Square',
          zipCode: 'E14 5LB',
          email: '',
        },
      },
    ]);
  });
});

describe('an ACH beneficiary', () => {
  it('saves the routing number, the account type and the address both pages collected', async () => {
    const user = userEvent.setup();
    const created: RecipientFields[] = [];
    const preview = createPreviewBeneficiaryRepository();
    await renderDetails(
      {
        currency: 'USD',
        method: 'ach',
        values: {
          accountHolder: 'Precious Jameson',
          routingNumber: '021000021',
          accountNumber: '0123456789',
          accountType: 'checking',
        },
      },
      {
        ...preview,
        create: (fields) => {
          created.push(fields);

          return preview.create(fields);
        },
      },
    );

    expect(await screen.findByLabelText('Bank name')).toBeOnTheScreen();
    expect(screen.queryByLabelText('SWIFT code')).not.toBeOnTheScreen();

    await user.type(screen.getByLabelText('Bank name'), 'Chase');
    await user.type(screen.getByLabelText('Street address'), '270 Park Avenue');
    await user.press(screen.getByRole('button', { name: 'Country' }));
    await user.press(await screen.findByRole('button', { name: 'United States' }));
    await user.type(screen.getByLabelText('City'), 'New York');
    await user.type(screen.getByLabelText('State'), 'NY');
    await user.type(screen.getByLabelText('Postal code'), '10017');
    await user.press(screen.getByRole('button', { name: 'Save beneficiary' }));

    expect(await screen.findByRole('header', { name: 'List' })).toBeOnTheScreen();
    expect(created).toEqual([
      {
        bankCountry: 'us',
        bankName: 'Chase',
        bankCode: '021000021',
        accountHolder: 'Precious Jameson',
        swiftNumber: '',
        accountNumber: '0123456789',
        paymentMethod: 'ACH',
        accountType: 'checking',
        contact: {
          country: 'us',
          state: 'NY',
          city: 'New York',
          address: '270 Park Avenue',
          zipCode: '10017',
          email: '',
        },
      },
    ]);
  });
});

describe('params that name no second page', () => {
  it.each([
    ['a corridor with one page', { ...PAGE_ONE, currency: 'NGN', method: 'bank_transfer' }],
    ['a corridor that cannot be saved', { ...PAGE_ONE, currency: 'VND', method: 'crypto' }],
    ['a corridor that does not exist', { ...PAGE_ONE, currency: 'GBP' }],
  ])('refuses %s', async (_case, params) => {
    await renderDetails(params);

    expect(await screen.findByRole('button', { name: 'Save beneficiary' })).toBeDisabled();
    expect(screen.queryByLabelText('Street address')).not.toBeOnTheScreen();
  });
});
