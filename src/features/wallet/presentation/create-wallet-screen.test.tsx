import { Alert, Linking } from 'react-native';
import { act, fireEvent, screen, userEvent, waitFor } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { forbidden, offline, unknownError } from '@/core/errors/app-error';
import { createEphemeralTokenPersistence } from '@/core/network/token-persistence';
import { err, ok } from '@/core/result/result';
import { KycState } from '@/core/session/onboarding-gate';
import { createSessionStore, type SessionUser } from '@/core/session/session-store';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type { Wallet } from '../domain/entity/wallet-entity';
import type { CircleChallengeOutcome, CircleWalletPort } from '../domain/port/circle-wallet-port';
import type { WalletRepository } from '../domain/repository/wallet-repository';
import { CreateWalletScreen } from './create-wallet-screen';
import { WALLET_CHECK_TIMEOUT_MS } from './hook/use-wallet-setup';

jest.useFakeTimers();

const wallet: Wallet = { id: 'w1', address: '4k3D', blockchain: 'SOL', balances: [] };
const USER: SessionUser = { id: 'u1', firstName: 'Ada', kycState: KycState.Approved };
const challenge = { challengeId: 'c1', userToken: 'u1', encryptionKey: 'k1' };

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function renderCreateWallet(
  overrides: {
    wallets?: Wallet[];
    user?: SessionUser;
    getWallets?: WalletRepository['getWallets'];
    executeChallenge?: CircleWalletPort['executeChallenge'];
    createChallenge?: WalletRepository['createChallenge'];
    keepsSession?: boolean;
  } = {},
) {
  const createChallenge =
    overrides.createChallenge ?? jest.fn(() => Promise.resolve(ok(challenge)));

  const sessionStore = createSessionStore();
  sessionStore.getState().signedIn(overrides.user ?? USER, 'create-wallet');

  const container = createTestContainer({
    sessionStore: asValue(sessionStore),
    tokenPersistence: asValue({
      ...createEphemeralTokenPersistence(),
      persists: () => Promise.resolve(overrides.keepsSession ?? true),
    }),
    walletRepository: asValue({
      getWallets: overrides.getWallets ?? (() => Promise.resolve(ok(overrides.wallets ?? []))),
      createChallenge,
      createPinChangeChallenge: jest.fn(() => Promise.resolve(ok(challenge))),
    } satisfies WalletRepository),
    circleWalletPort: asValue({
      executeChallenge:
        overrides.executeChallenge ?? (() => Promise.resolve(ok({ type: 'cancelled' }))),
    } satisfies CircleWalletPort),
  });

  const view = await renderWithProviders(<CreateWalletScreen />, {
    withNavigation: true,
    container,
  });

  return { ...view, createChallenge, sessionStore };
}

const outcome = (value: CircleChallengeOutcome) => () => Promise.resolve(ok(value));

describe('CreateWalletScreen — the silent check on mount', () => {
  it('shows a spinner and no Start button while it decides', async () => {
    let resolveWallets: (value: unknown) => void = () => undefined;
    const container = createTestContainer({
      walletRepository: asValue({
        getWallets: () => new Promise((resolve) => (resolveWallets = resolve)),
        createChallenge: jest.fn(),
        createPinChangeChallenge: jest.fn(),
      } as unknown as WalletRepository),
    });

    await renderWithProviders(<CreateWalletScreen />, { withNavigation: true, container });

    expect(await screen.findByLabelText('Checking your wallet')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start' })).toBeNull();

    await act(async () => {
      resolveWallets(ok([]));
    });
  });

  it('offers Start when the check never answers', async () => {
    await renderCreateWallet({ getWallets: () => new Promise(() => undefined) });

    await act(async () => {
      jest.advanceTimersByTime(WALLET_CHECK_TIMEOUT_MS);
    });

    expect(await screen.findByRole('button', { name: 'Start' })).toBeTruthy();
  });

  it('offers Start when the check throws', async () => {
    await renderCreateWallet({
      getWallets: () =>
        new Promise((_resolve, reject) => setTimeout(() => reject(new Error('boom')), 1)),
    });

    await act(async () => {
      jest.advanceTimersByTime(1);
    });

    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
  });

  it('offers Start once the check finds no wallet', async () => {
    await renderCreateWallet();

    expect(await screen.findByRole('button', { name: 'Start' })).toBeTruthy();
  });

  it('admits an account that already has a wallet straight to home', async () => {
    const { sessionStore } = await renderCreateWallet({ wallets: [wallet] });

    await screen.findByLabelText('Checking your wallet');
    await waitFor(() => {
      expect(sessionStore.getState().stage).toBe('ready');
    });
  });

  it('offers verification to an account that already has a wallet but owes it', async () => {
    const { sessionStore } = await renderCreateWallet({
      wallets: [wallet],
      user: { ...USER, kycState: KycState.NotStarted },
    });

    await screen.findByLabelText('Checking your wallet');
    await waitFor(() => {
      expect(sessionStore.getState().stage).toBe('kyc');
    });
  });

  it('asks an account that already has a wallet for a sign-in PIN first', async () => {
    const { sessionStore } = await renderCreateWallet({ wallets: [wallet], keepsSession: false });

    await screen.findByLabelText('Checking your wallet');
    await waitFor(() => {
      expect(sessionStore.getState().stage).toBe('secure-session');
    });
  });

  it('offers Start when the only listed wallet has no address', async () => {
    const { sessionStore } = await renderCreateWallet({ wallets: [{ ...wallet, address: '' }] });

    expect(await screen.findByRole('button', { name: 'Start' })).toBeTruthy();
    expect(sessionStore.getState().stage).toBe('create-wallet');
  });
});

describe('CreateWalletScreen — the way out on ios', () => {
  it('hands the frame an edge-swipe responder', async () => {
    await renderCreateWallet();
    let responders = 0;

    const walk = (node: unknown): void => {
      if (node === null || typeof node !== 'object') return;
      const candidate = node as { props?: Record<string, unknown>; children?: unknown[] };
      if (typeof candidate.props?.['onMoveShouldSetResponder'] === 'function') responders += 1;
      candidate.children?.forEach(walk);
    };
    walk(screen.toJSON());

    expect(responders).toBe(1);
  });

  it('signs the user out to the welcome screen when they finish later', async () => {
    const { sessionStore } = await renderCreateWallet();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    await user.press(await screen.findByRole('button', { name: 'Skip for now' }));
    await user.press(await screen.findByRole('button', { name: 'Finish later' }));

    expect(sessionStore.getState().status).toBe('unauthenticated');
  });
});

describe('CreateWalletScreen — outcomes', () => {
  async function press() {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.press(await screen.findByRole('button', { name: 'Start' }));
  }

  it('advances to provisioning without saying anything when the challenge settles', async () => {
    const { sessionStore } = await renderCreateWallet({
      executeChallenge: outcome({ type: 'settled', status: 'complete', resultType: 'initialize' }),
    });

    await press();

    expect(sessionStore.getState().stage).toBe('provisioning');
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('shows nothing at all when the user closes the sdk sheet', async () => {
    const { sessionStore } = await renderCreateWallet({
      executeChallenge: outcome({ type: 'cancelled' }),
    });

    await press();

    expect(alertSpy).not.toHaveBeenCalled();
    expect(sessionStore.getState().stage).not.toBe('provisioning');
    expect(await screen.findByRole('button', { name: 'Start' })).toBeTruthy();
  });

  it('advances on an unconfirmed outcome and says so', async () => {
    const { sessionStore } = await renderCreateWallet({
      executeChallenge: outcome({ type: 'settled', status: 'unknown', resultType: 'initialize' }),
    });

    await press();

    expect(sessionStore.getState().stage).toBe('provisioning');
    expect(alertSpy).toHaveBeenCalledWith('We couldn’t confirm wallet setup. Please try again.');
  });

  it.each(['failed', 'expired'] as const)('stays put and explains on %s', async (status) => {
    const { sessionStore } = await renderCreateWallet({
      executeChallenge: outcome({ type: 'settled', status, resultType: 'initialize' }),
    });

    await press();

    expect(alertSpy).toHaveBeenCalledWith('Wallet setup couldn’t be completed. Please try again.');
    expect(sessionStore.getState().stage).not.toBe('provisioning');
  });

  it('says the PIN did not match rather than a generic try-again', async () => {
    await renderCreateWallet({
      executeChallenge: outcome({ type: 'failed', reason: 'incorrect-pin', message: 'raw' }),
    });

    await press();

    expect(alertSpy).toHaveBeenCalledWith('That PIN didn’t match. Please try again.');
  });

  it('uses the locked-pin copy rather than a generic try-again', async () => {
    await renderCreateWallet({
      executeChallenge: outcome({ type: 'failed', reason: 'pin-locked', message: 'locked' }),
    });

    await press();

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('locked'));
  });

  it('renders circles own words for an unrecognised failure', async () => {
    await renderCreateWallet({
      executeChallenge: outcome({
        type: 'failed',
        reason: 'unknown',
        message: 'Something specific went wrong',
      }),
    });

    await press();

    expect(alertSpy).toHaveBeenCalledWith('Something specific went wrong');
  });

  it('says nothing when biometrics are unavailable', async () => {
    await renderCreateWallet({
      executeChallenge: outcome({
        type: 'failed',
        reason: 'biometrics-unavailable',
        message: 'no sensor',
      }),
    });

    await press();

    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('reports an sdk that could not run without leaking its detail', async () => {
    await renderCreateWallet({
      executeChallenge: () =>
        Promise.resolve(err(unknownError('token-1 and challenge c1 are in here'))),
    });

    await press();

    expect(alertSpy).toHaveBeenCalledWith('Something went wrong. Please try again.');
    expect(alertSpy).not.toHaveBeenCalledWith(expect.stringContaining('token-1'));
  });

  it('explains when no challenge could be minted and stays put', async () => {
    const { sessionStore } = await renderCreateWallet({
      createChallenge: () => Promise.resolve(err(offline())),
    });

    await press();

    expect(alertSpy).toHaveBeenCalledWith('We couldn’t start wallet setup. Please try again.');
    expect(sessionStore.getState().stage).toBe('create-wallet');
  });
});

describe('CreateWalletScreen — when the server refuses to mint a challenge', () => {
  async function press() {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.press(await screen.findByRole('button', { name: 'Start' }));
  }

  type AlertButton = { text?: string; onPress?: () => void };
  const alertButtons = () => (alertSpy.mock.calls[0]?.[2] ?? []) as AlertButton[];

  it('stays on wallet setup and never sends the user to verification', async () => {
    const { sessionStore } = await renderCreateWallet({
      createChallenge: () => Promise.resolve(err(forbidden())),
    });

    await press();

    expect(sessionStore.getState().stage).toBe('create-wallet');
  });

  it('explains the refusal with a way to reach support', async () => {
    await renderCreateWallet({ createChallenge: () => Promise.resolve(err(forbidden())) });

    await press();

    expect(alertSpy).toHaveBeenCalledWith(
      'We couldn’t set up your wallet',
      'Your account can’t create a wallet right now. Contact support and we’ll help you finish.',
      [
        expect.objectContaining({ text: 'Close' }),
        expect.objectContaining({ text: 'Contact support' }),
      ],
    );
  });

  it('opens a support email from the alert', async () => {
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderCreateWallet({ createChallenge: () => Promise.resolve(err(forbidden())) });

    await press();
    await act(async () => {
      alertButtons()
        .find((button) => button.text === 'Contact support')
        ?.onPress?.();
    });

    expect(openUrl).toHaveBeenCalledWith(expect.stringMatching(/^mailto:/));
  });

  it('leaks no backend detail', async () => {
    await renderCreateWallet({
      createChallenge: () => Promise.resolve(err(unknownError('user u1 token abc'))),
    });

    await press();

    expect(JSON.stringify(alertSpy.mock.calls)).not.toContain('abc');
  });
});

describe('CreateWalletScreen — the double-tap guard', () => {
  it('mints one challenge however fast Start is pressed twice', async () => {
    const { createChallenge } = await renderCreateWallet({
      executeChallenge: () =>
        new Promise((resolve) => setTimeout(() => resolve(ok({ type: 'cancelled' })), 50)),
    });
    const start = await screen.findByRole('button', { name: 'Start' });

    void fireEvent.press(start);
    void fireEvent.press(start);
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    expect(createChallenge).toHaveBeenCalledTimes(1);
  });
});
