import { Alert, AppState, BackHandler, Linking, type AppStateStatus } from 'react-native';
import { act, screen, userEvent, waitFor } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { forbidden } from '@/core/errors/app-error';
import { createEphemeralTokenPersistence } from '@/core/network/token-persistence';
import { createSessionStore, type SessionUser } from '@/core/session/session-store';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type {
  StreamWalletProvisioningUseCase,
  WalletProvisioningOutcome,
} from '../domain/usecase/stream-wallet-provisioning-usecase';
import { WalletProvisioningScreen } from './wallet-provisioning-screen';
import { KycState } from '@/core/session/onboarding-gate';

jest.useFakeTimers();

const USER: SessionUser = { id: 'u1', firstName: 'Ada', kycState: KycState.Approved };
const BACK_PRESS = { type: 'hardwareBackPress', timeStamp: 0 };

let alertSpy: jest.SpyInstance;
let appStateListeners: ((state: AppStateStatus) => void)[];
let backListeners: Parameters<typeof BackHandler.addEventListener>[1][];

beforeEach(() => {
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  appStateListeners = [];
  backListeners = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
    appStateListeners.push(handler);
    return { remove: () => undefined };
  });
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    backListeners.push(handler);
    return { remove: () => undefined };
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

const appMoves = async (state: AppStateStatus) => {
  await act(async () => {
    appStateListeners.forEach((listener) => {
      listener(state);
    });
  });
};

async function renderProvisioning(
  execute: StreamWalletProvisioningUseCase['execute'],
  { keepsSession = false }: { keepsSession?: boolean } = {},
) {
  const sessionStore = createSessionStore();
  sessionStore.getState().signedIn(USER, 'provisioning');
  const run = jest.fn(execute);

  const view = await renderWithProviders(<WalletProvisioningScreen />, {
    withNavigation: true,
    container: createTestContainer({
      sessionStore: asValue(sessionStore),
      tokenPersistence: asValue({
        ...createEphemeralTokenPersistence(),
        persists: () => Promise.resolve(keepsSession),
      }),
      streamWalletProvisioningUseCase: asValue({
        execute: run,
      } satisfies StreamWalletProvisioningUseCase),
    }),
  });

  return { ...view, sessionStore, run };
}

const settles = (outcome: WalletProvisioningOutcome) => () => Promise.resolve(outcome);
const never = () => new Promise<WalletProvisioningOutcome>(() => undefined);

describe('WalletProvisioningScreen', () => {
  describe('while it waits', () => {
    it('tells the user what is happening', async () => {
      await renderProvisioning(never);

      expect(await screen.findByLabelText('Setting up your wallet')).toBeTruthy();
      expect(screen.getByText('This usually takes a few seconds.')).toBeTruthy();
    });

    it('starts the poll without forcing an immediate check', async () => {
      const { run } = await renderProvisioning(never);

      expect(run).toHaveBeenCalledWith(expect.objectContaining({ checkNow: false }));
    });

    it('says so when it is taking longer than usual', async () => {
      await renderProvisioning((options) => {
        options?.onProgress?.('slow');
        return never();
      });

      expect(
        await screen.findByText(
          'This is taking a little longer than usual. Keep the app open — we’ll move on as soon as it’s ready.',
        ),
      ).toBeTruthy();
    });

    it('says so while reconnecting', async () => {
      await renderProvisioning((options) => {
        options?.onProgress?.('reconnecting');
        return never();
      });

      expect(await screen.findByText('Waiting for a connection…')).toBeTruthy();
    });

    it('offers a way off from the first frame', async () => {
      await renderProvisioning(never);

      await act(async () => {
        [...backListeners].reverse().some((listener) => listener.call(BackHandler, BACK_PRESS));
      });

      expect(await screen.findByText('Finish this later?')).toBeTruthy();
    });
  });

  it('asks for a sign-in PIN once the wallet appears', async () => {
    const { sessionStore } = await renderProvisioning(settles({ type: 'success', wallets: [] }));

    await screen.findByLabelText('Setting up your wallet');

    await waitFor(() => {
      expect(sessionStore.getState().stage).toBe('secure-session');
    });
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('moves straight on when a sign-in PIN already keeps the session', async () => {
    const { sessionStore } = await renderProvisioning(settles({ type: 'success', wallets: [] }), {
      keepsSession: true,
    });

    await waitFor(() => {
      expect(sessionStore.getState().stage).toBe('ready');
    });
  });

  describe('when the wait runs out', () => {
    it('stays here and offers to check again or finish later', async () => {
      const { sessionStore } = await renderProvisioning(settles({ type: 'timeout' }));

      expect(await screen.findByText('Your wallet is still on its way')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Check again' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Skip for now' })).toBeTruthy();
      expect(sessionStore.getState().stage).toBe('provisioning');
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('checks again at once when asked', async () => {
      const { run } = await renderProvisioning(settles({ type: 'timeout' }));
      run.mockImplementation(never);
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      await user.press(await screen.findByRole('button', { name: 'Check again' }));

      expect(run).toHaveBeenCalledTimes(2);
      expect(run).toHaveBeenLastCalledWith(expect.objectContaining({ checkNow: true }));
      expect(await screen.findByLabelText('Setting up your wallet')).toBeTruthy();
    });

    it('signs out to the welcome screen when the user finishes later', async () => {
      const { sessionStore } = await renderProvisioning(settles({ type: 'timeout' }));
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      await user.press(await screen.findByRole('button', { name: 'Skip for now' }));
      await user.press(await screen.findByRole('button', { name: 'Finish later' }));

      expect(sessionStore.getState().status).toBe('unauthenticated');
    });
  });

  describe('when the wallet cannot be confirmed', () => {
    it('explains and offers support', async () => {
      const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
      const { sessionStore } = await renderProvisioning(
        settles({ type: 'failure', error: forbidden() }),
      );
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      expect(await screen.findByText('We couldn’t confirm your wallet')).toBeTruthy();
      await user.press(screen.getByRole('button', { name: 'Contact support' }));

      expect(openUrl).toHaveBeenCalledWith(expect.stringMatching(/^mailto:/));
      expect(sessionStore.getState().stage).toBe('provisioning');
    });
  });

  describe('in the background', () => {
    it('stops polling, then checks at once on return', async () => {
      let signal: AbortSignal | undefined;
      const { run } = await renderProvisioning((options) => {
        signal = options?.signal;
        return never();
      });

      await appMoves('background');
      expect(signal?.aborted).toBe(true);

      await appMoves('active');
      expect(run).toHaveBeenCalledTimes(2);
      expect(run).toHaveBeenLastCalledWith(expect.objectContaining({ checkNow: true }));
    });

    it('carries on through a brief inactive state', async () => {
      let signal: AbortSignal | undefined;
      const { run } = await renderProvisioning((options) => {
        signal = options?.signal;
        return never();
      });

      await appMoves('inactive');
      await appMoves('active');

      expect(signal?.aborted).toBe(false);
      expect(run).toHaveBeenCalledTimes(1);
    });
  });

  it('aborts the poll when the screen goes away', async () => {
    let signal: AbortSignal | undefined;
    const view = await renderProvisioning((options) => {
      signal = options?.signal;
      return never();
    });

    expect(signal?.aborted).toBe(false);

    await act(async () => {
      void view.unmount();
    });

    expect(signal?.aborted).toBe(true);
  });

  it('says nothing when the poll reports it was cancelled', async () => {
    const { sessionStore } = await renderProvisioning(settles({ type: 'cancelled' }));

    await screen.findByLabelText('Setting up your wallet');

    expect(alertSpy).not.toHaveBeenCalled();
    expect(sessionStore.getState().stage).toBe('provisioning');
  });
});
