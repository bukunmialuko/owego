import { screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { FeatureFlag, createStaticFeatureFlags } from '@/core/feature-flags/feature-flags';
import { ok } from '@/core/result/result';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type { EsimRepository } from '../domain/repository/esim-repository';
import type { InsuranceRepository } from '../domain/repository/insurance-repository';
import { TravelScreen } from './travel-screen';

jest.useFakeTimers();

function emptyRepositories() {
  const esimRepository: Partial<EsimRepository> = {
    getInstalled: () => Promise.resolve(ok([])),
  };
  const insuranceRepository: Partial<InsuranceRepository> = {
    getPolicies: () => Promise.resolve(ok([])),
  };

  return {
    esimRepository: asValue(esimRepository as EsimRepository),
    insuranceRepository: asValue(insuranceRepository as InsuranceRepository),
  };
}

function travelFlags(isLaunched: boolean) {
  return {
    featureFlags: asValue(createStaticFeatureFlags({ [FeatureFlag.Travel]: isLaunched })),
  };
}

function failingRepositories() {
  return {
    esimRepository: asValue({
      getInstalled: () => Promise.reject(new Error('offline')),
    } as unknown as EsimRepository),
    insuranceRepository: asValue({
      getPolicies: () => Promise.reject(new Error('offline')),
    } as unknown as InsuranceRepository),
  };
}

function renderTravel(
  options: { theme?: 'light' | 'dark'; hasNothing?: boolean; isLaunched?: boolean } = {},
) {
  return renderWithProviders(<TravelScreen />, {
    withNavigation: true,
    container: createTestContainer({
      ...travelFlags(options.isLaunched ?? true),
      ...(options.hasNothing === true ? emptyRepositories() : {}),
    }),
    ...(options.theme === undefined ? {} : { theme: options.theme }),
  });
}

describe('TravelScreen overscroll', () => {
  it.each([
    ['the hub', false],
    ['the intro', true],
  ])('holds %s at its ends instead of bouncing', async (_name, hasNothing) => {
    await renderTravel({ hasNothing });
    await screen.findByText(hasNothing ? 'Flights, paid in USDC' : 'Travel');

    expect(bouncingScrollViews()).toHaveLength(0);
  });
});

function artworkBitmaps() {
  const found: unknown[] = [];

  const walk = (node: unknown): void => {
    if (node === null || typeof node !== 'object') return;
    const n = node as { type?: string; props?: Record<string, unknown>; children?: unknown[] };
    if (n.type === 'Image') found.push(n.props);
    n.children?.forEach(walk);
  };

  walk(screen.toJSON());

  return found;
}

function bouncingScrollViews() {
  const found: unknown[] = [];

  const walk = (node: unknown): void => {
    if (node === null || typeof node !== 'object') return;
    const candidate = node as {
      type?: string;
      props?: Record<string, unknown>;
      children?: unknown[];
    };
    if (candidate.type === 'RCTScrollView' && candidate.props?.['bounces'] !== false)
      found.push(candidate.props);
    candidate.children?.forEach(walk);
  };

  walk(screen.toJSON());

  return found;
}

describe('TravelScreen intro', () => {
  it('explains what the feature offers to someone with no eSIM and no policy', async () => {
    await renderTravel({ hasNothing: true });

    expect(await screen.findByText('Flights, paid in USDC')).toBeTruthy();
    expect(screen.getByText('Data in 200+ countries')).toBeTruthy();
    expect(screen.getByText("Covered while you're away")).toBeTruthy();
  });

  it('names the hero artwork for a screen reader', async () => {
    await renderTravel({ hasNothing: true });

    expect(await screen.findByLabelText('Travel')).toBeTruthy();
  });

  it('opens the hub once the intro is accepted', async () => {
    const user = userEvent.setup();
    await renderTravel({ hasNothing: true });

    await user.press(await screen.findByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('button', { name: /Get your global eSIM/ })).toBeTruthy();
  });

  it('skips the pitch entirely for someone who already holds an eSIM', async () => {
    await renderTravel();

    expect(await screen.findByRole('button', { name: /Get your global eSIM/ })).toBeTruthy();
    expect(screen.queryByText('Flights, paid in USDC')).toBeNull();
  });

  it('skips the pitch when the account could not be read', async () => {
    await renderWithProviders(<TravelScreen />, {
      withNavigation: true,
      container: createTestContainer({ ...travelFlags(true), ...failingRepositories() }),
    });

    expect(await screen.findByRole('button', { name: /Get your global eSIM/ })).toBeTruthy();
    expect(screen.queryByText('Flights, paid in USDC')).toBeNull();
  });
});

describe('TravelScreen before launch', () => {
  it('offers Coming soon where Continue would be', async () => {
    await renderTravel({ hasNothing: true, isLaunched: false });

    expect(await screen.findByRole('button', { name: 'Coming soon' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
  });

  it('answers Coming soon with the coming-soon sheet instead of the hub', async () => {
    const user = userEvent.setup();
    await renderTravel({ hasNothing: true, isLaunched: false });

    await user.press(await screen.findByRole('button', { name: 'Coming soon' }));

    expect(await screen.findByText('Coming Soon!')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Get your global eSIM/ })).toBeNull();
  });

  it('pitches to someone who already holds an eSIM rather than opening the hub', async () => {
    await renderTravel({ isLaunched: false });

    expect(await screen.findByRole('button', { name: 'Coming soon' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Get your global eSIM/ })).toBeNull();
  });

  it('pitches even when the account could not be read', async () => {
    await renderWithProviders(<TravelScreen />, {
      withNavigation: true,
      container: createTestContainer({ ...travelFlags(false), ...failingRepositories() }),
    });

    expect(await screen.findByRole('button', { name: 'Coming soon' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Get your global eSIM/ })).toBeNull();
  });
});

describe('TravelScreen hub', () => {
  it('offers all three products', async () => {
    await renderTravel();

    expect(await screen.findByRole('button', { name: /Book flights with USDC/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Travel insurance/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Get your global eSIM/ })).toBeTruthy();
  });

  it('reaches the policies list', async () => {
    await renderTravel();

    expect(await screen.findByRole('button', { name: 'My policies' })).toBeTruthy();
  });

  it('renders in dark mode without losing its cards', async () => {
    await renderTravel({ theme: 'dark' });

    expect(await screen.findByRole('button', { name: /Get your global eSIM/ })).toBeTruthy();
  });

  it.each(['light', 'dark'] as const)('draws the promo illustrations in %s mode', async (theme) => {
    await renderTravel({ theme });
    await screen.findByRole('button', { name: /Get your global eSIM/ });

    expect(artworkBitmaps()).toHaveLength(2);
  });
});
