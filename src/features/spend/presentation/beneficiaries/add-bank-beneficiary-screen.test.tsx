import { NavigationContainer, useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { act, screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { offline, type AppError } from '@/core/errors/app-error';
import { err, type Result } from '@/core/result/result';
import { Text } from '@/shared/ui';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { createPreviewBeneficiaryRepository } from '../../data/repository/preview-beneficiary-repository';
import type { RecipientFields } from '../../domain/entity/beneficiary';
import type { BeneficiaryRepository } from '../../domain/repository/beneficiary-repository';
import { AddBankBeneficiaryScreen } from './add-bank-beneficiary-screen';
import type { BeneficiariesParamList } from './beneficiaries-param-list';

jest.useFakeTimers();

const Stack = createNativeStackNavigator<BeneficiariesParamList>();

const opened: { route: string; params: unknown }[] = [];

function Probe() {
  const route = useRoute();
  opened.push({ route: route.name, params: route.params });

  return <Text accessibilityRole="header">{route.name}</Text>;
}

beforeEach(() => {
  opened.length = 0;
});

function watchedRepository(overrides: Partial<BeneficiaryRepository> = {}) {
  const created: RecipientFields[] = [];
  const preview = createPreviewBeneficiaryRepository();
  const repository: BeneficiaryRepository = {
    ...preview,
    create: (fields) => {
      created.push(fields);

      return preview.create(fields);
    },
    ...overrides,
  };

  return { created, repository };
}

function renderAdd(repository?: BeneficiaryRepository, params?: BeneficiariesParamList['AddBank']) {
  return renderWithProviders(
    <NavigationContainer
      initialState={{ index: 1, routes: [{ name: 'List' }, { name: 'AddBank', params }] }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="List" component={Probe} />
        <Stack.Screen name="AddBank" component={AddBankBeneficiaryScreen} />
        <Stack.Screen name="AddBankDetails" component={Probe} />
        <Stack.Screen name="ScanMerchant" component={Probe} />
      </Stack.Navigator>
    </NavigationContainer>,
    {
      container: createTestContainer(
        repository === undefined ? {} : { beneficiaryRepository: asValue(repository) },
      ),
    },
  );
}

type User = ReturnType<typeof userEvent.setup>;

async function choose(user: User, field: string, option: string | RegExp) {
  await user.press(await screen.findByRole('button', { name: field }));
  await user.press(await screen.findByRole('button', { name: option }));
}

async function fillZelle(user: User, zelleId = 'precious.james@mail.com') {
  await choose(user, 'Currency', 'United States Dollar, USD');
  await choose(user, 'Payment method', 'Zelle');
  await choose(user, 'Beneficiary category', 'Individual');
  await user.type(await screen.findByLabelText('Name'), 'Precious Jameson');
  await user.type(screen.getByLabelText('Zelle ID'), zelleId);
}

describe('choosing how the beneficiary is paid', () => {
  it('opens on the currency it was handed, with its form ready', async () => {
    await renderAdd(undefined, { currency: 'NGN' });

    expect(await screen.findByText('Nigerian Naira')).toBeOnTheScreen();
    expect(screen.getByLabelText('Account number')).toBeOnTheScreen();
  });

  it('still lets the currency it opened on be changed', async () => {
    const user = userEvent.setup();
    await renderAdd(undefined, { currency: 'NGN' });

    await screen.findByText('Nigerian Naira');
    await choose(user, 'Currency', 'United States Dollar, USD');

    expect(await screen.findByText('United States Dollar')).toBeOnTheScreen();
    expect(screen.queryByText('Nigerian Naira')).not.toBeOnTheScreen();
  });

  it('ignores a handed currency no form can save', async () => {
    await renderAdd(undefined, { currency: 'VND' });

    expect(await screen.findByRole('button', { name: 'Currency' })).toBeOnTheScreen();
    expect(screen.queryByText('Vietnamese Dong')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Payment method' })).not.toBeOnTheScreen();
  });

  it('asks for a currency before anything else', async () => {
    await renderAdd();

    expect(await screen.findByRole('header', { name: 'Add Beneficiary' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Currency' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Payment method' })).not.toBeOnTheScreen();
  });

  it('opens the merchant scanner for a currency paid by scanning', async () => {
    const user = userEvent.setup();
    await renderAdd();

    await choose(user, 'Currency', /Vietnamese Dong/);

    expect(await screen.findByRole('header', { name: 'ScanMerchant' })).toBeOnTheScreen();
    expect(opened.at(-1)).toEqual({ route: 'ScanMerchant', params: undefined });
  });

  it('offers every currency, the scan-to-pay ones included', async () => {
    const user = userEvent.setup();
    await renderAdd();

    await user.press(await screen.findByRole('button', { name: 'Currency' }));

    expect(await screen.findByRole('button', { name: /Vietnamese Dong/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Indonesian Rupiah/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Nigerian Naira/ })).toBeEnabled();
  });

  it('offers Zelle, ACH and SWIFT', async () => {
    const user = userEvent.setup();
    await renderAdd();

    await choose(user, 'Currency', 'United States Dollar, USD');
    await user.press(await screen.findByRole('button', { name: 'Payment method' }));

    expect(await screen.findByRole('button', { name: 'ACH' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Zelle' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'SWIFT' })).toBeEnabled();
  });
});

describe('the keyboard each number opens', () => {
  it('opens the number pad for a Nigerian account number', async () => {
    const user = userEvent.setup();
    await renderAdd();

    await choose(user, 'Currency', 'Nigerian Naira, NGN');

    expect(await screen.findByLabelText('Account number')).toHaveProp('keyboardType', 'number-pad');
  });

  it('opens the number pad for an ACH routing and account number', async () => {
    const user = userEvent.setup();
    await renderAdd();

    await choose(user, 'Currency', 'United States Dollar, USD');
    await choose(user, 'Payment method', 'ACH');

    expect(await screen.findByLabelText('Routing number')).toHaveProp('keyboardType', 'number-pad');
    expect(screen.getByLabelText('Account number')).toHaveProp('keyboardType', 'number-pad');
  });

  it('keeps the full keyboard for a SWIFT account number', async () => {
    const user = userEvent.setup();
    await renderAdd();

    await choose(user, 'Currency', 'United States Dollar, USD');
    await choose(user, 'Payment method', 'SWIFT');

    expect(await screen.findByLabelText('Account number')).toHaveProp('keyboardType', 'default');
  });
});

describe('saving in one step', () => {
  it('saves a Zelle recipient and returns to the bank accounts tab', async () => {
    const user = userEvent.setup();
    const { created, repository } = watchedRepository();
    await renderAdd(repository);

    await fillZelle(user);
    await user.press(screen.getByRole('button', { name: 'Save beneficiary' }));

    expect(await screen.findByRole('header', { name: 'List' })).toBeOnTheScreen();
    expect(opened.at(-1)).toEqual({ route: 'List', params: { tab: 'bank' } });
    expect(created).toEqual([
      expect.objectContaining({
        bankCountry: 'us',
        bankName: 'Zelle',
        bankCode: 'zelle_individual',
        accountHolder: 'Precious Jameson',
        accountNumber: 'precious.james@mail.com',
      }),
    ]);
  });

  it('keeps Save shut until the form is complete', async () => {
    const user = userEvent.setup();
    await renderAdd();

    await choose(user, 'Currency', 'United States Dollar, USD');
    await choose(user, 'Payment method', 'Zelle');

    expect(await screen.findByRole('button', { name: 'Save beneficiary' })).toBeDisabled();
  });

  it('saves a Nigerian account under the holder the server resolved', async () => {
    const user = userEvent.setup();
    const { created, repository } = watchedRepository();
    await renderAdd(repository);

    await choose(user, 'Currency', 'Nigerian Naira, NGN');
    await choose(user, 'Bank name', 'Guaranty Trust Bank');
    await user.type(await screen.findByLabelText('Account number'), '0123456789');

    expect(screen.getByRole('button', { name: 'Save beneficiary' })).toBeDisabled();
    expect(await screen.findByDisplayValue('Hannah Nuggest')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Save beneficiary' }));

    expect(await screen.findByRole('header', { name: 'List' })).toBeOnTheScreen();
    expect(created).toEqual([
      expect.objectContaining({
        bankCountry: 'ng',
        bankName: 'Guaranty Trust Bank',
        bankCode: '058',
        accountHolder: 'Hannah Nuggest',
        accountNumber: '0123456789',
      }),
    ]);
  });

  it('names who is already saved rather than saving them twice', async () => {
    const user = userEvent.setup();
    const { created, repository } = watchedRepository();
    await renderAdd(repository);

    await fillZelle(user, 'ethan.brooks@mail.com');
    await user.press(screen.getByRole('button', { name: 'Save beneficiary' }));

    expect(
      await screen.findByText('Ethan Brooks is already saved with these details.'),
    ).toBeOnTheScreen();
    expect(created).toEqual([]);
  });

  it('stays, and says so, when the save fails', async () => {
    const user = userEvent.setup();
    await renderAdd({
      ...createPreviewBeneficiaryRepository(),
      create: () => Promise.resolve(err(offline())),
    });

    await fillZelle(user);
    await user.press(screen.getByRole('button', { name: 'Save beneficiary' }));

    expect(
      await screen.findByText('We couldn’t save this beneficiary. Try again.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Add Beneficiary' })).toBeOnTheScreen();
  });

  it('saves once however often Save is pressed', async () => {
    const user = userEvent.setup();
    let settle: (value: Result<void, AppError>) => void = () => undefined;
    const { created, repository } = watchedRepository();
    await renderAdd({
      ...repository,
      create: (fields) => {
        created.push(fields);

        return new Promise((resolve) => {
          settle = resolve;
        });
      },
    });

    await fillZelle(user);
    const save = screen.getByRole('button', { name: 'Save beneficiary' });
    await user.press(save);
    await user.press(save);

    expect(created).toHaveLength(1);

    await act(async () => {
      settle({ ok: true, value: undefined });
      await Promise.resolve();
    });
  });
});

describe('a corridor with a second page', () => {
  it('continues ACH to the bank details with what this page collected', async () => {
    const user = userEvent.setup();
    await renderAdd();

    await choose(user, 'Currency', 'United States Dollar, USD');
    await choose(user, 'Payment method', 'ACH');
    await user.type(await screen.findByLabelText('Account holder'), 'Precious Jameson');
    await user.type(screen.getByLabelText('Routing number'), '021000021');
    await user.type(screen.getByLabelText('Account number'), '0123456789');
    await choose(user, 'Account type', 'Checking');
    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('header', { name: 'AddBankDetails' })).toBeOnTheScreen();
    expect(opened.at(-1)).toEqual({
      route: 'AddBankDetails',
      params: {
        currency: 'USD',
        method: 'ach',
        values: {
          accountHolder: 'Precious Jameson',
          routingNumber: '021000021',
          accountNumber: '0123456789',
          accountType: 'checking',
        },
      },
    });
  });

  it('continues SWIFT to the bank details with what this page collected', async () => {
    const user = userEvent.setup();
    await renderAdd();

    await choose(user, 'Currency', 'United States Dollar, USD');
    await choose(user, 'Payment method', 'SWIFT');
    await user.type(await screen.findByLabelText('Account holder'), 'Hannah Nuggest');
    await user.type(screen.getByLabelText('Account number'), '031234567890');
    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('header', { name: 'AddBankDetails' })).toBeOnTheScreen();
    expect(opened.at(-1)).toEqual({
      route: 'AddBankDetails',
      params: {
        currency: 'USD',
        method: 'swift',
        values: { accountHolder: 'Hannah Nuggest', accountNumber: '031234567890' },
      },
    });
  });
});
