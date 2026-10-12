import { NavigationContainer, useRoute, type RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { act, screen, userEvent, waitFor } from '@testing-library/react-native';
import { asValue } from 'awilix';
import type { ComponentType } from 'react';
import { offline, type AppError } from '@/core/errors/app-error';
import { err, type Result } from '@/core/result/result';
import { Text } from '@/shared/ui';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { createPreviewBeneficiaryRepository } from '../../data/repository/preview-beneficiary-repository';
import type { BeneficiaryRepository } from '../../domain/repository/beneficiary-repository';
import { useBeneficiaryDirectory } from '../hook/use-beneficiaries';
import { BeneficiaryDetailsScreen } from './beneficiary-details-screen';
import type { BeneficiariesParamList } from './beneficiaries-param-list';

jest.useFakeTimers();

const Stack = createNativeStackNavigator<BeneficiariesParamList>();

function ListProbe() {
  return <Text accessibilityRole="header">List</Text>;
}

function TabListProbe() {
  const tab = useRoute<RouteProp<BeneficiariesParamList, 'List'>>().params?.tab ?? 'none';

  return <Text accessibilityRole="header">{`List on ${tab}`}</Text>;
}

function ReadingListProbe() {
  useBeneficiaryDirectory();

  return <Text accessibilityRole="header">List</Text>;
}

function watchedRepository(overrides: Partial<BeneficiaryRepository> = {}) {
  const removed: string[] = [];
  const preview = createPreviewBeneficiaryRepository();
  const repository: BeneficiaryRepository = {
    ...preview,
    remove: (id) => {
      removed.push(id);

      return preview.remove(id);
    },
    ...overrides,
  };

  return { removed, repository };
}

function renderDetails(
  beneficiaryId: string,
  repository?: BeneficiaryRepository,
  list: ComponentType = ListProbe,
) {
  return renderWithProviders(
    <NavigationContainer
      initialState={{
        index: 1,
        routes: [{ name: 'List' }, { name: 'Details', params: { beneficiaryId } }],
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="List" component={list} />
        <Stack.Screen name="Details" component={BeneficiaryDetailsScreen} />
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

async function askToRemove(user: User) {
  await user.press(await screen.findByRole('button', { name: 'Remove beneficiary' }));
}

describe('what the details show', () => {
  it('shows a SWIFT beneficiary with its code and the address on one line', async () => {
    await renderDetails('b3');

    expect(await screen.findByText('Hannah Nuggest')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Beneficiary details' })).toBeOnTheScreen();
    expect(screen.getByText('Citi bank')).toBeOnTheScreen();
    expect(screen.getByText('031234567890')).toBeOnTheScreen();
    expect(screen.getByText('CITIGB2L')).toBeOnTheScreen();
    expect(
      screen.getByText('33 Canada Square, London, Greater London E14 5LB, United Kingdom'),
    ).toBeOnTheScreen();
  });

  it('names a Zelle category in words', async () => {
    await renderDetails('b1');

    expect(await screen.findByText('Business')).toBeOnTheScreen();
    expect(screen.getByText('precious.james@mail.com')).toBeOnTheScreen();
  });

  it('shows a wallet by its network and its whole address', async () => {
    await renderDetails('w1');

    expect(await screen.findByText('Main wallet')).toBeOnTheScreen();
    expect(screen.getByText('Solana')).toBeOnTheScreen();
    expect(screen.getByText('Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx3')).toBeOnTheScreen();
  });

  it('shows a saved merchant by the name, city and currency its code carries', async () => {
    await renderDetails('m1');

    expect((await screen.findAllByText('Fulano de Tal')).length).toBeGreaterThan(0);
    expect(screen.getByText('BRASILIA')).toBeOnTheScreen();
    expect(screen.getByText('BRL')).toBeOnTheScreen();
    expect(screen.queryByText(/br\.gov\.bcb\.pix/)).not.toBeOnTheScreen();
  });

  it('shows what it can of a beneficiary it cannot place', async () => {
    await renderDetails('b2');

    expect(await screen.findByText('BDO Unibank')).toBeOnTheScreen();
    expect(screen.getByText('004870011028')).toBeOnTheScreen();
  });

  it('says so when the beneficiary cannot be loaded, and offers nothing to remove', async () => {
    await renderDetails('nobody');

    expect(await screen.findByText('We couldn’t load this beneficiary.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Remove beneficiary' })).not.toBeOnTheScreen();
  });
});

describe('removing', () => {
  it('asks first, naming who and what will go', async () => {
    const user = userEvent.setup();
    await renderDetails('b3');

    await askToRemove(user);

    expect(await screen.findByText('Remove beneficiary?')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'This will permanently delete Hannah Nuggest’s bank details. This action cannot be undone.',
      ),
    ).toBeOnTheScreen();
  });

  it('says it is a wallet address that will go, for a wallet', async () => {
    const user = userEvent.setup();
    await renderDetails('w1');

    await askToRemove(user);

    expect(
      await screen.findByText(
        'This will permanently delete Main wallet’s wallet address. This action cannot be undone.',
      ),
    ).toBeOnTheScreen();
  });

  it('says it is a merchant code that will go, for a merchant', async () => {
    const user = userEvent.setup();
    await renderDetails('m1');

    await askToRemove(user);

    expect(
      await screen.findByText(
        'This will permanently delete Fulano de Tal’s merchant code. This action cannot be undone.',
      ),
    ).toBeOnTheScreen();
  });

  it('keeps the beneficiary when the removal is cancelled', async () => {
    const user = userEvent.setup();
    const { removed, repository } = watchedRepository();
    await renderDetails('b3', repository);

    await askToRemove(user);
    await user.press(await screen.findByRole('button', { name: 'No, cancel' }));

    expect(screen.queryByText('Remove beneficiary?')).not.toBeOnTheScreen();
    expect(removed).toEqual([]);
  });

  it('removes the beneficiary and returns to the list', async () => {
    const user = userEvent.setup();
    const { removed, repository } = watchedRepository();
    await renderDetails('b3', repository);

    await askToRemove(user);
    await user.press(await screen.findByRole('button', { name: 'Yes, remove beneficiary' }));

    expect(await screen.findByRole('header', { name: 'List' })).toBeOnTheScreen();
    expect(removed).toEqual(['b3']);
  });

  it('returns to the list as soon as the removal is confirmed, not when the list has reloaded', async () => {
    const user = userEvent.setup();
    const preview = createPreviewBeneficiaryRepository();
    let reads = 0;
    await renderDetails(
      'b3',
      {
        ...preview,
        list: () => {
          reads += 1;
          return reads === 1 ? preview.list() : new Promise(() => undefined);
        },
      },
      ReadingListProbe,
    );

    await askToRemove(user);
    await user.press(await screen.findByRole('button', { name: 'Yes, remove beneficiary' }));

    await waitFor(() => {
      expect(screen.queryByText('Remove beneficiary?')).not.toBeOnTheScreen();
    });
    expect(screen.getByRole('header', { name: 'List' })).toBeOnTheScreen();
    expect(reads).toBe(2);
  });

  it.each([
    ['a wallet', 'w1', 'List on wallet'],
    ['a bank account', 'b3', 'List on bank'],
  ])('returns to the tab %s was listed on', async (_kind, beneficiaryId, landed) => {
    const user = userEvent.setup();
    await renderDetails(beneficiaryId, undefined, TabListProbe);

    await askToRemove(user);
    await user.press(await screen.findByRole('button', { name: 'Yes, remove beneficiary' }));

    expect(await screen.findByRole('header', { name: landed })).toBeOnTheScreen();
  });

  it('removes once however often the button is pressed', async () => {
    const user = userEvent.setup();
    let settle: (value: Result<void, AppError>) => void = () => undefined;
    const { removed, repository } = watchedRepository();
    await renderDetails('b3', {
      ...repository,
      remove: (id) => {
        removed.push(id);

        return new Promise((resolve) => {
          settle = resolve;
        });
      },
    });

    await askToRemove(user);
    const confirm = await screen.findByRole('button', { name: 'Yes, remove beneficiary' });
    await user.press(confirm);
    await user.press(confirm);

    expect(removed).toEqual(['b3']);

    await act(async () => {
      settle({ ok: true, value: undefined });
      await Promise.resolve();
    });
  });

  it('stays, and says so, when the removal fails', async () => {
    const user = userEvent.setup();
    await renderDetails('b3', {
      ...createPreviewBeneficiaryRepository(),
      remove: () => Promise.resolve(err(offline())),
    });

    await askToRemove(user);
    await user.press(await screen.findByRole('button', { name: 'Yes, remove beneficiary' }));

    expect(
      await screen.findByText('We couldn’t remove this beneficiary. Try again.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Beneficiary details' })).toBeOnTheScreen();
  });
});

const Root = createNativeStackNavigator();

function PaymentProbe() {
  const route = useRoute();

  return <Text accessibilityRole="header">{`${route.name} ${JSON.stringify(route.params)}`}</Text>;
}

function BeneficiariesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="List" component={ListProbe} />
      <Stack.Screen name="Details" component={BeneficiaryDetailsScreen} />
    </Stack.Navigator>
  );
}

function renderPayable(beneficiaryId: string) {
  return renderWithProviders(
    <NavigationContainer
      initialState={{
        index: 0,
        routes: [
          {
            name: 'Beneficiaries',
            state: {
              index: 1,
              routes: [{ name: 'List' }, { name: 'Details', params: { beneficiaryId } }],
            },
          },
        ],
      }}
    >
      <Root.Navigator screenOptions={{ headerShown: false }}>
        <Root.Screen name="Beneficiaries" component={BeneficiariesStack} />
        <Root.Screen name="BankTransfer" component={PaymentProbe} />
        <Root.Screen name="SendAsset" component={PaymentProbe} />
      </Root.Navigator>
    </NavigationContainer>,
  );
}

describe('paying from the details', () => {
  it('opens the transfer form for a payee a form can pay, filled in', async () => {
    const user = userEvent.setup();
    await renderPayable('p2');

    await user.press(await screen.findByRole('button', { name: 'Pay' }));

    expect(
      await screen.findByText(
        'BankTransfer {"screen":"Recipient","params":{"prefill":{"currency":"NGN","method":"bank_transfer","values":{"bankCode":"058","accountNumber":"0152847803"}}}}',
      ),
    ).toBeOnTheScreen();
  });

  it('opens Send for a saved wallet', async () => {
    const user = userEvent.setup();
    await renderPayable('w1');

    await user.press(await screen.findByRole('button', { name: 'Pay' }));

    expect(
      await screen.findByText(
        'SendAsset {"screen":"Recipient","params":{"prefill":{"address":"Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx3","networkCode":"SOL"}}}',
      ),
    ).toBeOnTheScreen();
  });

  it('opens the merchant amount page with a saved merchant’s code', async () => {
    const user = userEvent.setup();
    await renderPayable('m1');

    await user.press(await screen.findByRole('button', { name: 'Pay' }));

    expect(await screen.findByText(/^BankTransfer \{"screen":"MerchantAmount"/)).toBeOnTheScreen();
  });

  it('offers no Pay for a payee no form can pay, and still offers Remove', async () => {
    await renderPayable('b3');

    expect(await screen.findByRole('button', { name: 'Remove beneficiary' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Pay' })).not.toBeOnTheScreen();
  });
});
