import { AppState, Text, type AppStateStatus } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { asValue } from 'awilix';
import type { TokenPersistence } from '@/core/network/token-persistence';
import { ok } from '@/core/result/result';
import { createAppLockHold } from '@/core/session/app-lock-hold';
import { BACKGROUND_GRACE_MS, IDLE_TIMEOUT_MS } from '@/core/session/app-lock-triggers';
import { createSessionStore, type OnboardingStage } from '@/core/session/session-store';
import { createFakeTokenStore } from '@/test/fake-token-store';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { AppLockGate } from './app-lock-gate';
import { KycState } from '@/core/session/onboarding-gate';

const USER = { id: 'user-1', firstName: 'Ada', kycState: KycState.Approved };

function fakePersistence(persists: Promise<boolean>): TokenPersistence {
  return {
    persists: () => persists,
    save: () => Promise.resolve(ok(undefined)),
    clear: () => Promise.resolve(ok(undefined)),
  };
}

let notifyAppState: ((state: AppStateStatus) => void) | undefined;
let removeAppStateSubscription: jest.Mock;

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['setImmediate'] });
  notifyAppState = undefined;
  removeAppStateSubscription = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
    notifyAppState = handler;

    return { remove: removeAppStateSubscription };
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

type MountOptions = {
  session?: { stage: OnboardingStage; locked?: boolean };
  booting?: boolean;
  persists?: Promise<boolean>;
};

async function mount({
  session,
  booting = false,
  persists = Promise.resolve(true),
}: MountOptions = {}) {
  const sessionStore = createSessionStore();

  if (session !== undefined) {
    sessionStore.getState().signedIn(USER, session.stage);
    if (session.locked === true) sessionStore.getState().locked();
  } else if (!booting) {
    sessionStore.getState().signedOut();
  }

  const tokenStore = createFakeTokenStore({ access: 'access-token', refresh: 'refresh-token' });
  const appLockHold = createAppLockHold();

  const view = await renderWithProviders(
    <AppLockGate>
      <Text>home</Text>
    </AppLockGate>,
    {
      container: createTestContainer({
        sessionStore: asValue(sessionStore),
        tokenStore: asValue(tokenStore),
        tokenPersistence: asValue(fakePersistence(persists)),
        appLockHold: asValue(appLockHold),
      }),
    },
  );

  await act(async () => {});

  return {
    sessionStore,
    tokenStore,
    appLockHold,
    unmount: view.unmount,
    get stage() {
      return sessionStore.getState().stage;
    },
    get status() {
      return sessionStore.getState().status;
    },
    async advance(ms: number) {
      await act(async () => {
        jest.advanceTimersByTime(ms);
      });
    },
    async touch() {
      return fireEvent(screen.getByText('home'), 'startShouldSetResponderCapture');
    },
    async appState(next: AppStateStatus) {
      await act(async () => {
        notifyAppState?.(next);
      });
    },
  };
}

describe('AppLockGate', () => {
  it('renders the app underneath it', async () => {
    await mount({ session: { stage: 'ready' } });

    expect(screen.getByText('home')).toBeOnTheScreen();
  });

  describe('idling in the foreground', () => {
    it('locks a live session once it has been left alone past the idle timeout', async () => {
      const gate = await mount({ session: { stage: 'ready' } });

      await gate.advance(IDLE_TIMEOUT_MS);

      expect(gate.stage).toBe('locked');
    });

    it('stays open while a money move holds the lock off', async () => {
      const gate = await mount({ session: { stage: 'ready' } });
      const release = gate.appLockHold.hold();

      await gate.advance(IDLE_TIMEOUT_MS * 2);
      expect(gate.stage).toBe('ready');

      release();
      await gate.advance(IDLE_TIMEOUT_MS);
      expect(gate.stage).toBe('locked');
    });

    it('drops the bearer so no request can leave the app while locked', async () => {
      const gate = await mount({ session: { stage: 'ready' } });

      await gate.advance(IDLE_TIMEOUT_MS);

      expect(gate.tokenStore.current).toBeUndefined();
    });

    it('drops the bearer before the lock becomes visible to the router', async () => {
      const gate = await mount({ session: { stage: 'ready' } });
      let tokensWhenLockObserved: unknown = 'never observed';
      gate.sessionStore.subscribe((state) => {
        if (state.stage === 'locked') tokensWhenLockObserved = gate.tokenStore.current;
      });

      await gate.advance(IDLE_TIMEOUT_MS);

      expect(tokensWhenLockObserved).toBeUndefined();
    });

    it('stays open while the user is still interacting', async () => {
      const gate = await mount({ session: { stage: 'ready' } });

      await gate.advance(IDLE_TIMEOUT_MS - 1);
      await gate.touch();
      await gate.advance(IDLE_TIMEOUT_MS - 1);

      expect(gate.stage).toBe('ready');
    });

    it('locks a full timeout after the last interaction, not after the first', async () => {
      const gate = await mount({ session: { stage: 'ready' } });

      await gate.advance(IDLE_TIMEOUT_MS - 1);
      await gate.touch();
      await gate.advance(IDLE_TIMEOUT_MS);

      expect(gate.stage).toBe('locked');
    });

    it('never claims the touch it observed', async () => {
      const gate = await mount({ session: { stage: 'ready' } });

      await expect(gate.touch()).resolves.toBe(false);
    });
  });

  describe('when nothing was persisted', () => {
    const NOTHING_PERSISTED = {
      session: { stage: 'ready' as const },
      persists: Promise.resolve(false),
    };

    it('does not lock on idle', async () => {
      const gate = await mount(NOTHING_PERSISTED);

      await gate.advance(IDLE_TIMEOUT_MS);

      expect(gate.stage).toBe('ready');
    });

    it('does not lock when the app is left and comes back', async () => {
      const gate = await mount(NOTHING_PERSISTED);

      await gate.appState('background');
      await gate.advance(BACKGROUND_GRACE_MS);
      await gate.appState('active');

      expect(gate.stage).toBe('ready');
    });

    it('keeps the access token', async () => {
      const gate = await mount(NOTHING_PERSISTED);

      await gate.appState('background');
      await gate.advance(BACKGROUND_GRACE_MS);
      await gate.appState('active');

      expect((await gate.tokenStore.read())?.access).toBe('access-token');
    });
  });

  describe('leaving and coming back', () => {
    it('locks when the app comes back after the grace window has passed', async () => {
      const gate = await mount({ session: { stage: 'ready' } });

      await gate.appState('background');
      await gate.advance(BACKGROUND_GRACE_MS);
      await gate.appState('active');

      expect(gate.stage).toBe('locked');
    });

    it('stays open when the app comes straight back', async () => {
      const gate = await mount({ session: { stage: 'ready' } });

      await gate.appState('background');
      await gate.advance(BACKGROUND_GRACE_MS - 1);
      await gate.appState('active');

      expect(gate.stage).toBe('ready');
    });

    it('treats the iOS app switcher as leaving', async () => {
      const gate = await mount({ session: { stage: 'ready' } });

      await gate.appState('inactive');
      await gate.advance(BACKGROUND_GRACE_MS);
      await gate.appState('active');

      expect(gate.stage).toBe('locked');
    });

    it('waits for the return rather than locking while the app is away', async () => {
      const gate = await mount({ session: { stage: 'ready' } });

      await gate.appState('background');
      await gate.advance(IDLE_TIMEOUT_MS);

      expect(gate.stage).toBe('ready');

      await gate.appState('active');

      expect(gate.stage).toBe('locked');
    });

    it('restarts the idle countdown after a return inside the grace window', async () => {
      const gate = await mount({ session: { stage: 'ready' } });

      await gate.appState('background');
      await gate.advance(BACKGROUND_GRACE_MS - 1);
      await gate.appState('active');
      await gate.advance(IDLE_TIMEOUT_MS);

      expect(gate.stage).toBe('locked');
    });
  });

  describe('what it refuses to arm for', () => {
    it('starts no countdown when the session does not survive the process', async () => {
      const gate = await mount({ session: { stage: 'ready' }, persists: Promise.resolve(false) });

      await gate.advance(IDLE_TIMEOUT_MS);

      expect(gate.stage).toBe('ready');
      expect(gate.tokenStore.current).toBeDefined();
    });

    it('leaves a signed-out user alone while they are signing in', async () => {
      const gate = await mount();

      await gate.advance(IDLE_TIMEOUT_MS);

      expect(gate.status).toBe('unauthenticated');
      expect(gate.tokenStore.current).toBeDefined();
    });

    it('ignores the app leaving and returning while nobody is signed in', async () => {
      const gate = await mount();

      await gate.appState('background');
      await gate.advance(BACKGROUND_GRACE_MS);
      await gate.appState('active');

      expect(gate.status).toBe('unauthenticated');
      expect(gate.tokenStore.current).toBeDefined();
    });

    it('does not arm while the session is still booting', async () => {
      const gate = await mount({ booting: true });

      await gate.advance(IDLE_TIMEOUT_MS);

      expect(gate.status).toBe('booting');
      expect(gate.tokenStore.current).toBeDefined();
    });

    it('does not lock a session that is already locked', async () => {
      const gate = await mount({ session: { stage: 'ready', locked: true } });

      await gate.advance(IDLE_TIMEOUT_MS);

      expect(gate.stage).toBe('locked');
      expect(gate.tokenStore.current).toBeDefined();
    });

    it('ignores a touch while nobody is signed in', async () => {
      const gate = await mount();

      await gate.touch();
      await gate.advance(IDLE_TIMEOUT_MS);

      expect(gate.status).toBe('unauthenticated');
      expect(gate.tokenStore.current).toBeDefined();
    });

    it('ignores a touch on the unlock screen of an already locked session', async () => {
      const gate = await mount({ session: { stage: 'ready', locked: true } });

      await gate.touch();
      await gate.advance(IDLE_TIMEOUT_MS);

      expect(gate.stage).toBe('locked');
      expect(gate.tokenStore.current).toBeDefined();
    });

    it('cancels a pending lock when the session ends underneath it', async () => {
      const gate = await mount({ session: { stage: 'ready' } });
      await gate.advance(IDLE_TIMEOUT_MS - 1);

      await act(async () => {
        gate.sessionStore.getState().signedOut();
      });
      await gate.advance(IDLE_TIMEOUT_MS);

      expect(gate.status).toBe('unauthenticated');
      expect(gate.tokenStore.current).toBeDefined();
    });
  });

  describe('mid-onboarding', () => {
    it.each(['kyc', 'create-wallet', 'provisioning', 'secure-session'] as const)(
      'locks a user idling on %s and brings them back to it',
      async (stage) => {
        const gate = await mount({ session: { stage } });

        await gate.advance(IDLE_TIMEOUT_MS);

        expect(gate.stage).toBe('locked');

        await act(async () => {
          gate.sessionStore.getState().unlocked();
        });

        expect(gate.stage).toBe(stage);
      },
    );
  });

  describe('once the gate goes away', () => {
    it('stops the countdown it started when the gate unmounts', async () => {
      const gate = await mount({ session: { stage: 'ready' } });
      await gate.advance(IDLE_TIMEOUT_MS - 1);

      await act(async () => {
        await gate.unmount();
      });
      await gate.advance(IDLE_TIMEOUT_MS);

      expect(gate.stage).toBe('ready');
      expect(gate.tokenStore.current).toBeDefined();
    });

    it('stops listening for app-state changes when the gate unmounts', async () => {
      const gate = await mount({ session: { stage: 'ready' } });

      await act(async () => {
        await gate.unmount();
      });

      expect(removeAppStateSubscription).toHaveBeenCalled();
    });

    it('does not arm when the persistence read lands after the gate is gone', async () => {
      let answerPersists: (persists: boolean) => void = () => undefined;
      const gate = await mount({
        session: { stage: 'ready' },
        persists: new Promise((resolve) => {
          answerPersists = resolve;
        }),
      });

      await act(async () => {
        await gate.unmount();
      });
      await act(async () => {
        answerPersists(true);
      });
      await gate.advance(IDLE_TIMEOUT_MS);

      expect(gate.stage).toBe('ready');
      expect(gate.tokenStore.current).toBeDefined();
    });
  });
});
