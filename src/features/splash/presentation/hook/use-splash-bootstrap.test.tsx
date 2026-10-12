import { act, screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { createSessionStore } from '@/core/session/session-store';
import { Button, Text } from '@/shared/ui';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type { BootstrapOutcome, BootstrapStep } from '../../domain/entity/bootstrap-outcome';
import type { BootstrapSessionUseCase } from '../../domain/usecase/bootstrap-session-usecase';
import type { SplashProfile } from '../../domain/port/splash-port';
import {
  BOOT_TIMEOUT_MS,
  MINIMUM_VISIBLE_MS,
  REVEAL_DELAY_MS,
  useSplashBootstrap,
} from './use-splash-bootstrap';

jest.useFakeTimers();

const PROFILE: SplashProfile = {
  id: 'u1',
  email: 'ada@owego.app',
  kycState: 'approved',
  firstName: 'Ada',
  country: 'NG',
};

function Harness() {
  const { progress, isRevealed, hasTimedOut, retry } = useSplashBootstrap();

  return (
    <>
      <Text>{`progress ${progress}`}</Text>
      <Text>{isRevealed ? 'revealed' : 'hidden'}</Text>
      <Text>{hasTimedOut ? 'timed out' : 'working'}</Text>
      <Button label="Try again" onPress={retry} />
    </>
  );
}

type PendingBoot = {
  step: (step: BootstrapStep) => void;
  settle: (outcome: BootstrapOutcome) => void;
};

function createControlledBootstrap() {
  const boots: PendingBoot[] = [];

  const useCase: BootstrapSessionUseCase = {
    execute: (onStep) =>
      new Promise<BootstrapOutcome>((resolve) => {
        boots.push({ step: onStep, settle: resolve });
      }),
  };

  return { useCase, boots };
}

function bootAt(boots: PendingBoot[], index: number): PendingBoot {
  const boot = boots[index];

  if (boot === undefined) throw new Error(`the boot never reached attempt ${index + 1}`);

  return boot;
}

function bootstrapReturning(outcome: BootstrapOutcome): BootstrapSessionUseCase {
  return { execute: () => Promise.resolve(outcome) };
}

async function renderSplash(bootstrapSessionUseCase: BootstrapSessionUseCase) {
  const sessionStore = createSessionStore();

  const view = await renderWithProviders(<Harness />, {
    container: createTestContainer({
      sessionStore: asValue(sessionStore),
      bootstrapSessionUseCase: asValue(bootstrapSessionUseCase),
    }),
  });

  return { sessionStore, unmount: view.unmount };
}

async function advance(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

async function settleBoot(outcome: BootstrapOutcome) {
  const rendered = await renderSplash(bootstrapReturning(outcome));
  await advance(MINIMUM_VISIBLE_MS);

  return rendered;
}

describe('useSplashBootstrap', () => {
  describe('what it draws while it works', () => {
    it('draws nothing but the mark until the reveal delay has passed', async () => {
      const { useCase } = createControlledBootstrap();
      await renderSplash(useCase);

      expect(screen.getByText('hidden')).toBeTruthy();

      await advance(REVEAL_DELAY_MS);

      expect(screen.getByText('revealed')).toBeTruthy();
    });

    it('moves the bar to the progress each step reports', async () => {
      const { useCase, boots } = createControlledBootstrap();
      await renderSplash(useCase);

      expect(screen.getByText('progress 0')).toBeTruthy();

      await act(async () => {
        bootAt(boots, 0).step('loading-profile');
      });

      expect(screen.getByText('progress 0.6')).toBeTruthy();

      await act(async () => {
        bootAt(boots, 0).step('finishing');
      });

      expect(screen.getByText('progress 1')).toBeTruthy();
    });
  });

  describe('what it hands the session', () => {
    it.each([
      ['home' as const, 'ready' as const],
      ['kyc' as const, 'kyc' as const],
      ['create-wallet' as const, 'create-wallet' as const],
    ])('stages a %s destination as %s', async (destination, stage) => {
      const { sessionStore } = await settleBoot({ destination, profile: PROFILE, offline: false });

      expect(sessionStore.getState().status).toBe('authenticated');
      expect(sessionStore.getState().stage).toBe(stage);
      expect(sessionStore.getState().user).toEqual({
        id: 'u1',
        firstName: 'Ada',
        kycState: 'APPROVED',
      });
    });

    it('hands the session the profile’s verification state', async () => {
      const { sessionStore } = await settleBoot({
        destination: 'create-wallet',
        profile: { ...PROFILE, kycState: ' not_started ' },
        offline: false,
      });

      expect(sessionStore.getState().user?.kycState).toBe('NOT_STARTED');
    });

    it('seals a sealed session behind the unlock ladder', async () => {
      const { sessionStore } = await settleBoot({
        destination: 'unlock',
        profile: PROFILE,
        offline: false,
      });

      expect(sessionStore.getState().status).toBe('authenticated');
      expect(sessionStore.getState().stage).toBe('locked');
      expect(sessionStore.getState().resumeStage).toBe('ready');
    });

    it('resumes a sealed session at the stage the boot resolved', async () => {
      const { sessionStore } = await settleBoot({
        destination: 'unlock',
        profile: PROFILE,
        resumeTo: 'kyc',
        offline: false,
      });

      expect(sessionStore.getState().stage).toBe('locked');
      expect(sessionStore.getState().resumeStage).toBe('kyc');
    });

    it('signs nobody in when the boot found no session to restore', async () => {
      const { sessionStore } = await settleBoot({ destination: 'auth', offline: false });

      expect(sessionStore.getState().status).toBe('unauthenticated');
      expect(sessionStore.getState().user).toBeUndefined();
    });

    it('treats a profile carrying no id as no session at all', async () => {
      const { sessionStore } = await settleBoot({
        destination: 'home',
        profile: { ...PROFILE, id: '' },
        offline: false,
      });

      expect(sessionStore.getState().status).toBe('unauthenticated');
      expect(sessionStore.getState().user).toBeUndefined();
    });

    it('treats a destination that arrived without a profile as no session at all', async () => {
      const { sessionStore } = await settleBoot({ destination: 'home', offline: false });

      expect(sessionStore.getState().status).toBe('unauthenticated');
      expect(sessionStore.getState().user).toBeUndefined();
    });

    it('carries a decision made from cached state through as offline', async () => {
      const { sessionStore } = await settleBoot({
        destination: 'home',
        profile: PROFILE,
        offline: true,
      });

      expect(sessionStore.getState().offline).toBe(true);
    });

    it('reports a decision made from the network as online', async () => {
      const { sessionStore } = await settleBoot({
        destination: 'home',
        profile: PROFILE,
        offline: false,
      });

      expect(sessionStore.getState().offline).toBe(false);
    });

    it('carries offline through even when there was no session to restore', async () => {
      const { sessionStore } = await settleBoot({ destination: 'auth', offline: true });

      expect(sessionStore.getState().status).toBe('unauthenticated');
      expect(sessionStore.getState().offline).toBe(true);
    });
  });

  describe('the timings it guarantees', () => {
    it('holds the splash up for the minimum visible window', async () => {
      const { sessionStore } = await renderSplash(
        bootstrapReturning({ destination: 'home', profile: PROFILE, offline: false }),
      );

      await advance(MINIMUM_VISIBLE_MS - 1);
      expect(sessionStore.getState().status).toBe('booting');

      await advance(1);
      expect(sessionStore.getState().status).toBe('authenticated');
    });

    it('routes at once when the boot took longer than the window on its own', async () => {
      const { useCase, boots } = createControlledBootstrap();
      const { sessionStore } = await renderSplash(useCase);

      await advance(MINIMUM_VISIBLE_MS + 100);

      await act(async () => {
        bootAt(boots, 0).settle({ destination: 'home', profile: PROFILE, offline: false });
      });

      expect(sessionStore.getState().status).toBe('authenticated');
    });

    it('offers a retry once the boot has hung for the timeout', async () => {
      const { useCase } = createControlledBootstrap();
      const { sessionStore } = await renderSplash(useCase);

      await advance(BOOT_TIMEOUT_MS - 1);
      expect(screen.getByText('working')).toBeTruthy();

      await advance(1);

      expect(screen.getByText('timed out')).toBeTruthy();
      expect(sessionStore.getState().status).toBe('booting');
    });

    it('never raises the timeout over a boot that already landed', async () => {
      const { sessionStore } = await settleBoot({
        destination: 'home',
        profile: PROFILE,
        offline: false,
      });

      await advance(BOOT_TIMEOUT_MS);

      expect(screen.getByText('working')).toBeTruthy();
      expect(sessionStore.getState().status).toBe('authenticated');
    });
  });

  describe('retrying', () => {
    const press = async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      await user.press(screen.getByRole('button', { name: 'Try again' }));
    };

    it('runs the boot again from an empty bar', async () => {
      const { useCase, boots } = createControlledBootstrap();
      const { sessionStore } = await renderSplash(useCase);

      await act(async () => {
        bootAt(boots, 0).step('loading-wallets');
      });
      await advance(BOOT_TIMEOUT_MS);
      await press();

      expect(screen.getByText('working')).toBeTruthy();
      expect(screen.getByText('progress 0')).toBeTruthy();
      expect(boots).toHaveLength(2);

      await act(async () => {
        bootAt(boots, 1).settle({ destination: 'home', profile: PROFILE, offline: false });
      });
      await advance(MINIMUM_VISIBLE_MS);

      expect(sessionStore.getState().status).toBe('authenticated');
    });

    it('ignores a boot that lands after the user has already retried', async () => {
      const { useCase, boots } = createControlledBootstrap();
      const { sessionStore } = await renderSplash(useCase);

      await advance(BOOT_TIMEOUT_MS);
      await press();

      await act(async () => {
        bootAt(boots, 0).settle({ destination: 'home', profile: PROFILE, offline: false });
      });
      await advance(MINIMUM_VISIBLE_MS);

      expect(sessionStore.getState().status).toBe('booting');
    });

    it('ignores a progress report from the boot the retry replaced', async () => {
      const { useCase, boots } = createControlledBootstrap();
      await renderSplash(useCase);

      await advance(BOOT_TIMEOUT_MS);
      await press();

      await act(async () => {
        bootAt(boots, 0).step('finishing');
      });

      expect(screen.getByText('progress 0')).toBeTruthy();
    });
  });

  it('leaves the session alone when the splash unmounts mid-wait', async () => {
    const { sessionStore, unmount } = await renderSplash(
      bootstrapReturning({ destination: 'home', profile: PROFILE, offline: false }),
    );

    await act(async () => {
      await unmount();
    });
    await advance(MINIMUM_VISIBLE_MS);

    expect(sessionStore.getState().status).toBe('booting');
  });

  it('leaves the session alone when the splash unmounts before the boot lands', async () => {
    const { useCase, boots } = createControlledBootstrap();
    const { sessionStore, unmount } = await renderSplash(useCase);

    await act(async () => {
      await unmount();
    });

    await act(async () => {
      bootAt(boots, 0).settle({ destination: 'home', profile: PROFILE, offline: false });
    });
    await advance(MINIMUM_VISIBLE_MS);

    expect(sessionStore.getState().status).toBe('booting');
  });
});
