import { NavigationContainer, useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient } from '@tanstack/react-query';
import { act, screen, userEvent } from '@testing-library/react-native';
import { isValidElement } from 'react';
import type { RefreshControlProps } from 'react-native';
import { asValue } from 'awilix';
import { offline } from '@/core/errors/app-error';
import { PAYEE_QUERY_ROOT } from '@/core/payee/payee';
import { err, ok, type Result } from '@/core/result/result';
import type { AppError } from '@/core/errors/app-error';
import type { Beneficiary } from '../../domain/entity/beneficiary';
import { Text } from '@/shared/ui';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { createPreviewBeneficiaryRepository } from '../../data/repository/preview-beneficiary-repository';
import type { BeneficiaryRepository } from '../../domain/repository/beneficiary-repository';
import { BeneficiaryListScreen } from './beneficiary-list-screen';
import type { BeneficiariesParamList } from './beneficiaries-param-list';

jest.useFakeTimers();

type Routes = BeneficiariesParamList & { Before: undefined };

const Stack = createNativeStackNavigator<Routes>();

const opened: { route: string; params: unknown }[] = [];

function Probe() {
  const route = useRoute();
  opened.push({ route: route.name, params: route.params });

  return <Text accessibilityRole="header">{route.name}</Text>;
}

beforeEach(() => {
  opened.length = 0;
});

function renderList(
  beneficiaryRepository?: BeneficiaryRepository,
  params?: BeneficiariesParamList['List'],
  queryClient?: QueryClient,
) {
  return renderWithProviders(
    <NavigationContainer
      initialState={{ index: 1, routes: [{ name: 'Before' }, { name: 'List', params }] }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Before" component={Probe} />
        <Stack.Screen name="List" component={BeneficiaryListScreen} />
        <Stack.Screen name="Details" component={Probe} />
        <Stack.Screen name="AddBank" component={Probe} />
        <Stack.Screen name="AddWallet" component={Probe} />
        <Stack.Screen name="ScanMerchant" component={Probe} />
      </Stack.Navigator>
    </NavigationContainer>,
    {
      container: createTestContainer(
        beneficiaryRepository === undefined
          ? {}
          : { beneficiaryRepository: asValue(beneficiaryRepository) },
      ),
      ...(queryClient === undefined ? {} : { queryClient }),
    },
  );
}

describe('the bank accounts tab', () => {
  it('lists saved bank accounts with a masked account line', async () => {
    await renderList();

    expect(
      await screen.findByRole('button', { name: 'Hannah Nuggest, Citi bank • **7890' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: /Jasper Nwosu, Guaranty Trust Bank/ }),
    ).toBeOnTheScreen();
  });

  it('keeps wallets off it', async () => {
    await renderList();

    await screen.findByRole('button', { name: /Hannah Nuggest/ });

    expect(screen.queryByRole('button', { name: /Main wallet/ })).not.toBeOnTheScreen();
  });

  it('lists a saved merchant by the name its code carries, with its currency beneath', async () => {
    await renderList();

    expect(await screen.findByRole('button', { name: 'Fulano de Tal, BRL' })).toBeOnTheScreen();
  });

  it('lists both of two beneficiaries with the same name', async () => {
    await renderList();

    expect(await screen.findAllByRole('button', { name: /^Precious Jameson/ })).toHaveLength(2);
  });
});

describe('the wallet address tab', () => {
  it('lists saved wallets by their tag and shortened address', async () => {
    const user = userEvent.setup();
    await renderList();

    await user.press(await screen.findByRole('tab', { name: 'Wallet address' }));

    expect(
      await screen.findByRole('button', { name: 'Main wallet, Bxxxxx…xxx3' }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Hannah Nuggest/ })).not.toBeOnTheScreen();
  });

  it('opens on the tab it is sent to', async () => {
    await renderList(undefined, { tab: 'wallet' });

    expect(await screen.findByRole('button', { name: /Business wallet/ })).toBeOnTheScreen();
  });
});

describe('searching', () => {
  it('narrows the tab to what is typed', async () => {
    const user = userEvent.setup();
    await renderList();

    await user.type(await screen.findByLabelText('Search name, bank or account number…'), 'citi');

    expect(await screen.findByRole('button', { name: /Hannah Nuggest/ })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Jasper Nwosu/ })).not.toBeOnTheScreen();
  });

  it('finds a wallet by its network', async () => {
    const user = userEvent.setup();
    await renderList(undefined, { tab: 'wallet' });

    await user.type(await screen.findByLabelText('Search tag, network or address…'), 'monad');

    expect(await screen.findByRole('button', { name: /Second wallet/ })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Main wallet/ })).not.toBeOnTheScreen();
  });

  it('says so when nobody matches', async () => {
    const user = userEvent.setup();
    await renderList();

    await user.type(await screen.findByLabelText('Search name, bank or account number…'), 'zzzz');

    expect(await screen.findByText('Nobody matches that search.')).toBeOnTheScreen();
  });
});

describe('an empty tab', () => {
  it('says there is nobody saved yet, and how to add someone', async () => {
    const banksOnly: BeneficiaryRepository = {
      ...createPreviewBeneficiaryRepository(),
      list: async () => {
        const all = await createPreviewBeneficiaryRepository().list();

        return ok((all.ok ? all.value : []).filter((beneficiary) => beneficiary.kind === 'bank'));
      },
    };
    await renderList(banksOnly, { tab: 'wallet' });

    expect(await screen.findByText('No saved wallet addresses')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Add wallet address' })).toBeOnTheScreen();
  });
});

describe('a list that cannot load', () => {
  it('says so and loads again on retry', async () => {
    const user = userEvent.setup();
    const preview = createPreviewBeneficiaryRepository();
    let attempts = 0;
    await renderList({
      ...preview,
      list: () => {
        attempts += 1;

        return attempts === 1 ? Promise.resolve(err(offline())) : preview.list();
      },
    });

    expect(await screen.findByText('We couldn’t load your beneficiaries.')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('button', { name: /Hannah Nuggest/ })).toBeOnTheScreen();
  });
});

describe('leaving the list', () => {
  it('opens a beneficiary by its id alone', async () => {
    const user = userEvent.setup();
    await renderList();

    await user.press(await screen.findByRole('button', { name: /Hannah Nuggest/ }));

    expect(opened.at(-1)).toEqual({ route: 'Details', params: { beneficiaryId: 'b3' } });
  });

  it('asks for a currency first, then opens the form on it', async () => {
    const user = userEvent.setup();
    await renderList();

    await user.press(await screen.findByRole('button', { name: 'Add bank account' }));
    expect(await screen.findByText('Select currency')).toBeOnTheScreen();
    await user.press(await screen.findByRole('button', { name: /Nigerian Naira/ }));

    expect(opened.at(-1)).toEqual({ route: 'AddBank', params: { currency: 'NGN' } });
  });

  it('opens the merchant scanner for a currency paid by scanning', async () => {
    const user = userEvent.setup();
    await renderList();

    await user.press(await screen.findByRole('button', { name: 'Add bank account' }));
    await user.press(await screen.findByRole('button', { name: /Vietnamese Dong/ }));

    expect(opened.at(-1)?.route).toBe('ScanMerchant');
  });

  it('opens nothing when the currency sheet is closed', async () => {
    const user = userEvent.setup();
    await renderList();

    await user.press(await screen.findByRole('button', { name: 'Add bank account' }));
    const sheetClose = (await screen.findAllByRole('button', { name: 'Close' })).at(-1);
    if (sheetClose === undefined) throw new Error('no way to close the sheet');
    await user.press(sheetClose);

    expect(opened.map((entry) => entry.route)).not.toContain('AddBank');
  });

  it('adds a wallet address from the wallet tab', async () => {
    const user = userEvent.setup();
    await renderList();

    await user.press(await screen.findByRole('tab', { name: 'Wallet address' }));
    await user.press(await screen.findByRole('button', { name: 'Add wallet address' }));

    expect(opened.at(-1)?.route).toBe('AddWallet');
  });

  it('closes back to wherever it was opened from', async () => {
    const user = userEvent.setup();
    await renderList();

    await user.press(await screen.findByRole('button', { name: 'Close' }));

    expect(await screen.findByRole('header', { name: 'Before' })).toBeOnTheScreen();
  });
});

type TreeNode = { parent: TreeNode | null; props: Record<string, unknown> };

function ancestorsOf(node: TreeNode): TreeNode[] {
  return node.parent === null ? [] : [node.parent, ...ancestorsOf(node.parent)];
}

function refreshControl(): RefreshControlProps {
  const row = screen.getByRole('button', { name: 'Hannah Nuggest, Citi bank • **7890' });
  const control = ancestorsOf(row).find((node) => node.props['refreshControl'] !== undefined)
    ?.props['refreshControl'];
  if (!isValidElement<RefreshControlProps>(control))
    throw new Error('the list has no refresh control');

  return control.props;
}

function reloadHeldOpen() {
  const preview = createPreviewBeneficiaryRepository();
  let reads = 0;
  let answer = (): void => undefined;
  const repository: BeneficiaryRepository = {
    ...preview,
    list: () => {
      reads += 1;
      if (reads === 1) return preview.list();

      return new Promise<Result<Beneficiary[], AppError>>((resolve) => {
        answer = () => {
          void preview.list().then(resolve);
        };
      });
    },
  };

  return { repository, answer: () => answer() };
}

async function settleUpdates() {
  for (let turn = 0; turn < 5; turn += 1) {
    await Promise.resolve();
    jest.advanceTimersByTime(10);
  }
}

describe('the pull-to-refresh spinner', () => {
  it('stays down while the list reloads on its own', async () => {
    const { repository, answer } = reloadHeldOpen();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await renderList(repository, undefined, queryClient);
    await screen.findByRole('button', { name: 'Hannah Nuggest, Citi bank • **7890' });

    await act(async () => {
      void queryClient.invalidateQueries({ queryKey: PAYEE_QUERY_ROOT });
      await settleUpdates();
    });

    expect(refreshControl().refreshing).toBe(false);

    await act(async () => {
      answer();
      await settleUpdates();
    });
  });

  it('shows for a pull until the list has reloaded, then lets go', async () => {
    const { repository, answer } = reloadHeldOpen();
    await renderList(repository);
    await screen.findByRole('button', { name: 'Hannah Nuggest, Citi bank • **7890' });

    await act(async () => {
      refreshControl().onRefresh?.();
      await settleUpdates();
    });
    expect(refreshControl().refreshing).toBe(true);

    await act(async () => {
      answer();
      await settleUpdates();
    });
    expect(refreshControl().refreshing).toBe(false);
  });
});
