import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { Text } from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { lightTheme } from '@/core/design-system';
import { serverError } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import { PreferenceKey } from '@/core/storage/storage-keys';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type { YieldOverviewRepository } from '@/core/yield/yield-overview';
import { WealthScreen } from './wealth-screen';

const TERMS_SENTENCE =
  'By tapping ‘Continue’, you have agreed to the Terms of Use and Privacy Policy';

type RenderOptions = {
  repository?: YieldOverviewRepository;
  theme?: 'light' | 'dark';
  hasAcceptedTerms?: boolean;
  displayCurrency?: string;
};

function answering(overview: Awaited<ReturnType<YieldOverviewRepository['getOverview']>>) {
  return { getOverview: () => Promise.resolve(overview) } satisfies YieldOverviewRepository;
}

function createWealthContainer(options: RenderOptions = {}) {
  const container = createTestContainer(
    options.repository === undefined
      ? {}
      : { yieldOverviewRepository: asValue(options.repository) },
  );
  if (options.hasAcceptedTerms === true) {
    container.resolve('cache').setString(PreferenceKey.WealthTermsAccepted, 'true');
  }
  if (options.displayCurrency !== undefined) {
    container.resolve('displayCurrencyStore').getState().select(options.displayCurrency);
  }

  return container;
}

async function renderWealth(options: RenderOptions = {}) {
  const container = createWealthContainer(options);

  await renderWithProviders(<WealthScreen />, {
    withNavigation: true,
    container,
    ...(options.theme === undefined ? {} : { theme: options.theme }),
  });

  return container;
}

async function settlePortfolio() {
  await waitFor(() => {
    expect(screen.queryAllByTestId('skeleton', { includeHiddenElements: true })).toHaveLength(0);
  });
}

async function renderDashboard(options: Omit<RenderOptions, 'hasAcceptedTerms'> = {}) {
  const container = await renderWealth({ ...options, hasAcceptedTerms: true });
  await settlePortfolio();

  return container;
}

function lastButton(name: string) {
  const button = screen.getAllByRole('button', { name }).at(-1);
  if (button === undefined) throw new Error(`expected a ${name} button`);

  return button;
}

async function openTermsSheet(user: ReturnType<typeof userEvent.setup>) {
  await user.press(await screen.findByRole('button', { name: 'Continue' }));
  await screen.findByText(TERMS_SENTENCE);
}

function textsInOrder(): string[] {
  const texts: string[] = [];

  const walk = (node: unknown): void => {
    if (typeof node === 'string') {
      texts.push(node);
      return;
    }
    if (node === null || typeof node !== 'object') return;
    (node as { children?: unknown[] }).children?.forEach(walk);
  };
  walk(screen.toJSON());

  return texts;
}

beforeEach(() => {
  jest.mocked(InAppBrowser.isAvailable).mockResolvedValue(true);
  jest.mocked(InAppBrowser.open).mockClear();
});

describe('WealthScreen overscroll', () => {
  it.each([
    ['the pitch', false],
    ['the dashboard', true],
  ])('holds %s at its ends instead of bouncing', async (_name, hasAcceptedTerms) => {
    await renderWealth({ hasAcceptedTerms });
    await screen.findByText(hasAcceptedTerms ? 'Do more with your money' : 'Yield up to 4.6% APY');
    await settlePortfolio();

    expect(bouncingScrollViews()).toHaveLength(0);
  });
});

function bouncingScrollViews() {
  const found: unknown[] = [];

  const walk = (node: unknown): void => {
    if (node === null || typeof node !== 'object') return;
    const n = node as { type?: string; props?: Record<string, unknown>; children?: unknown[] };
    if (n.type === 'RCTScrollView' && n.props?.['bounces'] !== false) found.push(n.props);
    n.children?.forEach(walk);
  };

  walk(screen.toJSON());

  return found;
}

describe('WealthScreen intro', () => {
  it('opens on the money-at-work pitch until the terms are accepted', async () => {
    await renderWealth();

    expect(await screen.findByText('Yield up to 4.6% APY')).toBeOnTheScreen();
    expect(screen.getByText('Investments from $1')).toBeOnTheScreen();
    expect(screen.getByText('Credit built from your history')).toBeOnTheScreen();
    expect(screen.getByText('Savings you can reach anytime')).toBeOnTheScreen();
    expect(screen.queryByText('Do more with your money')).toBeNull();
  });

  it('puts the small print above Continue', async () => {
    await renderWealth();
    await screen.findByText('Yield up to 4.6% APY');
    const texts = textsInOrder();

    expect(texts.indexOf('Yield is variable. Investments can fall in value.')).toBeLessThan(
      texts.indexOf('Continue'),
    );
    expect(screen.getByText('Terms & conditions apply')).toBeOnTheScreen();
  });

  it('opens the terms of use from the small print', async () => {
    const user = userEvent.setup();
    await renderWealth();

    await user.press(await screen.findByText('Terms & conditions'));

    await waitFor(() => {
      expect(InAppBrowser.open).toHaveBeenCalledWith('https://www.owego.app/terms-of-use');
    });
  });
});

describe('WealthScreen terms sheet', () => {
  it('asks for the terms on Continue instead of opening the dashboard', async () => {
    const user = userEvent.setup();
    await renderWealth();

    await openTermsSheet(user);

    expect(screen.queryByText('Do more with your money')).toBeNull();
  });

  it('leaves the user on the pitch, with nothing remembered, when the sheet is closed', async () => {
    const user = userEvent.setup();
    const container = await renderWealth();

    await openTermsSheet(user);
    await user.press(lastButton('Close'));

    expect(screen.queryByText(TERMS_SENTENCE)).toBeNull();
    expect(screen.getByText('Yield up to 4.6% APY')).toBeOnTheScreen();
    expect(container.resolve('cache').getString(PreferenceKey.WealthTermsAccepted)).toBeUndefined();
  });

  it('opens the dashboard and remembers the acceptance once the user continues', async () => {
    const user = userEvent.setup();
    const container = await renderWealth();

    await openTermsSheet(user);
    await user.press(lastButton('Continue'));

    expect(await screen.findByText('Do more with your money')).toBeOnTheScreen();
    expect(container.resolve('cache').getString(PreferenceKey.WealthTermsAccepted)).toBe('true');
    await settlePortfolio();
  });

  it.each([
    ['Terms of Use', 'https://www.owego.app/terms-of-use'],
    ['Privacy Policy', 'https://www.owego.app/privacy-policy'],
  ])('opens the %s from the sheet', async (link, url) => {
    const user = userEvent.setup();
    await renderWealth();

    await openTermsSheet(user);
    await user.press(screen.getByText(link));

    await waitFor(() => {
      expect(InAppBrowser.open).toHaveBeenCalledWith(url);
    });
  });

  it('opens straight on the dashboard once the terms have been accepted', async () => {
    await renderDashboard();

    expect(screen.getByText('Do more with your money')).toBeOnTheScreen();
    expect(screen.queryByText('Yield up to 4.6% APY')).toBeNull();
  });
});

describe('WealthScreen dashboard', () => {
  it('reports the portfolio value and what it has earned', async () => {
    await renderDashboard();

    expect(screen.getByLabelText('Portfolio value, $5,136.98')).toBeOnTheScreen();
    expect(screen.getByText('+2.2% ($336.35)')).toHaveStyle({
      color: lightTheme.color.textSuccess,
    });
  });

  it('shows a loss in the error colour, signed on both figures', async () => {
    await renderDashboard({
      repository: answering(
        ok({
          valueMinor: 41_000,
          currency: 'USD',
          change: { percent: -1.2, amountMinor: -410 },
          positions: [],
        }),
      ),
    });

    expect(screen.getByText('-1.2% (-$4.10)')).toHaveStyle({ color: lightTheme.color.textError });
  });

  it('shows $0.00 and no change line before anything is staked', async () => {
    await renderDashboard({
      repository: answering(ok({ valueMinor: 0, currency: 'USD', positions: [] })),
    });

    expect(screen.getByLabelText('Portfolio value, $0.00')).toBeOnTheScreen();
    expect(screen.queryByText(/% \(/)).toBeNull();
  });

  it('shows the holding in the display currency beneath it', async () => {
    await renderDashboard({ displayCurrency: 'NGN' });

    expect(screen.getByText('₦3,801.36')).toBeOnTheScreen();
    expect(screen.getByText('🇳🇬')).toBeOnTheScreen();
  });

  it('shows no converted chip while the display currency is dollars', async () => {
    await renderDashboard();

    expect(screen.queryByText('🇺🇸')).toBeNull();
  });

  it('reports a portfolio it could not load instead of showing a figure', async () => {
    await renderDashboard({ repository: answering(err(serverError(503))) });

    expect(screen.getByText('Something went wrong. Please try again.')).toBeOnTheScreen();
    expect(screen.queryByText('Portfolio value')).toBeNull();
  });

  it('offers the three ways to put money to work', async () => {
    await renderDashboard();

    expect(await screen.findByText('Earn up to 4.6% on idle USDC')).toBeOnTheScreen();
    expect(screen.getByText('Unlock credit from activity')).toBeOnTheScreen();
    expect(
      screen.getByText('Invest from $1 in Crypto, tokenized stocks, and staking'),
    ).toBeOnTheScreen();
  });

  it('hides the portfolio value on request', async () => {
    const user = userEvent.setup();
    await renderDashboard();

    await user.press(screen.getByRole('button', { name: 'Hide balance' }));

    expect(screen.getByLabelText('Balance hidden')).toBeOnTheScreen();
    expect(screen.queryByText('+2.2% ($336.35)')).toBeNull();
  });

  it('hides the converted chip with the value', async () => {
    const user = userEvent.setup();
    await renderDashboard({ displayCurrency: 'NGN' });

    await user.press(screen.getByRole('button', { name: 'Hide balance' }));

    expect(screen.queryByText('₦3,801.36')).toBeNull();
  });

  it('renders in dark mode without losing its cards', async () => {
    await renderDashboard({ theme: 'dark' });

    expect(await screen.findByText('Unlock credit from activity')).toBeOnTheScreen();
  });

  it.each([
    ['Credit, Unlock credit from activity'],
    ['Investment, Invest from $1 in Crypto, tokenized stocks, and staking'],
  ])('answers the %s tile with the coming-soon sheet', async (tile) => {
    const user = userEvent.setup();
    await renderDashboard();

    await user.press(await screen.findByRole('button', { name: tile }));

    expect(await screen.findByText('Coming Soon!')).toBeOnTheScreen();
  });

  it('closes the coming-soon sheet back onto the dashboard', async () => {
    const user = userEvent.setup();
    await renderDashboard();

    await user.press(screen.getByRole('button', { name: 'Credit, Unlock credit from activity' }));
    await screen.findByText('Coming Soon!');
    await user.press(lastButton('Close'));

    expect(screen.queryByText('Coming Soon!')).toBeNull();
    expect(screen.getByText('Do more with your money')).toBeOnTheScreen();
  });

  it('opens Yield from the yield tile', async () => {
    const user = userEvent.setup();
    const container = createWealthContainer({ hasAcceptedTerms: true });
    await renderWithProviders(<WealthWithYield />, { container });
    await settlePortfolio();

    await user.press(
      await screen.findByRole('button', { name: 'Yield, Earn up to 4.6% on idle USDC' }),
    );

    expect(await screen.findByText('Yield probe')).toBeOnTheScreen();
    expect(screen.queryByText('Coming Soon!')).toBeNull();
  });
});

const Stack = createNativeStackNavigator();

function YieldProbe() {
  return <Text>Yield probe</Text>;
}

function WealthWithYield() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Wealth" component={WealthScreen} />
        <Stack.Screen name="Yield" component={YieldProbe} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
