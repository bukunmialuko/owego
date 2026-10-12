import { Alert, Linking } from 'react-native';
import { act, screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { offline } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import { KycState } from '@/core/session/onboarding-gate';
import { createSessionStore, type SessionUser } from '@/core/session/session-store';
import { PreferenceKey } from '@/core/storage/storage-keys';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type { VerificationFailureReason } from '../domain/entity/kyc-entity';
import type { DiditPort, KycProfilePort } from '../domain/port/didit-port';
import type { KycRepository } from '../domain/repository/kyc-repository';
import { KycScreen } from './kyc-screen';

jest.useFakeTimers();

const session = { sessionId: 's1', sessionToken: 'token-1', url: 'https://didit', status: 'open' };
const USER: SessionUser = { id: 'u1', firstName: 'Ada', kycState: KycState.NotStarted };

let alertSpy: jest.SpyInstance;
let openSettingsSpy: jest.SpyInstance;

beforeEach(() => {
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  openSettingsSpy = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function renderKyc(
  overrides: {
    verify?: DiditPort['verify'];
    reloadKycState?: KycProfilePort['reloadKycState'];
    createSession?: KycRepository['createSession'];
  } = {},
) {
  const sessionStore = createSessionStore();
  sessionStore.getState().signedIn(USER, 'kyc');

  const container = createTestContainer({
    sessionStore: asValue(sessionStore),
    kycRepository: asValue({
      createSession: overrides.createSession ?? (() => Promise.resolve(ok(session))),
    } satisfies KycRepository),
    diditPort: asValue({
      verify: overrides.verify ?? (() => Promise.resolve(ok({ type: 'cancelled' as const }))),
    } satisfies DiditPort),
    kycProfilePort: asValue({
      reloadKycState: overrides.reloadKycState ?? (() => Promise.resolve(ok(KycState.Approved))),
    } satisfies KycProfilePort),
  });

  await renderWithProviders(<KycScreen />, { withNavigation: true, container });

  return container;
}

async function acceptAndContinue(user: ReturnType<typeof userEvent.setup>) {
  await user.press(screen.getByLabelText('Accept the Terms of Use and Privacy Policy'));
  await user.press(screen.getByRole('button', { name: 'Continue' }));
}

const failureCopy: [VerificationFailureReason, string][] = [
  ['session-expired', 'That verification session expired. Tap Continue to start a new one.'],
  ['retry-blocked', 'We can’t run another verification attempt right now. Please contact support.'],
  ['network', 'We couldn’t reach the verification service. Check your connection and try again.'],
  ['unknown', 'We couldn’t verify your identity. Please try again.'],
];

describe('KycScreen', () => {
  it('does not start verification until the terms are accepted', async () => {
    const verify = jest.fn(() => Promise.resolve(ok({ type: 'cancelled' as const })));
    const user = userEvent.setup();
    await renderKyc({ verify });

    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(verify).not.toHaveBeenCalled();
  });

  it.each([
    [KycState.Approved, 'Account verified successfully'],
    [KycState.Pending, 'Account verification in progress'],
  ])('reports %s as "%s" once the flow completes', async (state, message) => {
    const user = userEvent.setup();
    await renderKyc({
      verify: () => Promise.resolve(ok({ type: 'completed' as const })),
      reloadKycState: () => Promise.resolve(ok(state)),
    });

    await acceptAndContinue(user);

    expect(alertSpy).toHaveBeenCalledWith(message);
  });

  it('says nothing when the user cancels', async () => {
    const user = userEvent.setup();
    await renderKyc({ verify: () => Promise.resolve(ok({ type: 'cancelled' as const })) });

    await acceptAndContinue(user);

    expect(alertSpy).not.toHaveBeenCalled();
  });

  describe('onboarding stage', () => {
    it('lands on home once verification completes', async () => {
      const user = userEvent.setup();
      const container = await renderKyc({
        verify: () => Promise.resolve(ok({ type: 'completed' as const })),
      });

      await acceptAndContinue(user);

      expect(container.resolve('sessionStore').getState().stage).toBe('ready');
    });

    it.each([
      ['cancelled', { type: 'cancelled' as const }],
      ['failed', { type: 'failed' as const, reason: 'network' as const }],
    ])('leaves the stage alone when the flow is %s', async (_label, outcome) => {
      const user = userEvent.setup();
      const container = await renderKyc({ verify: () => Promise.resolve(ok(outcome)) });
      const before = container.resolve('sessionStore').getState().stage;

      await acceptAndContinue(user);

      expect(container.resolve('sessionStore').getState().stage).toBe(before);
    });
  });

  it.each(failureCopy)('shows its own copy for the %s failure', async (reason, message) => {
    const user = userEvent.setup();
    await renderKyc({ verify: () => Promise.resolve(ok({ type: 'failed' as const, reason })) });

    await acceptAndContinue(user);

    expect(alertSpy).toHaveBeenCalledWith(message);
  });

  describe('when the camera was refused on the sdk’s capture screen', () => {
    const denied = () =>
      Promise.resolve(ok({ type: 'failed' as const, reason: 'camera-access-denied' as const }));

    it('alerts exactly once', async () => {
      const user = userEvent.setup();
      await renderKyc({ verify: denied });

      await acceptAndContinue(user);

      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(alertSpy).toHaveBeenCalledWith(
        'Camera access is off',
        'Verifying your identity needs the camera. Turn it on in Settings to continue.',
        expect.any(Array),
      );
    });

    it('offers Settings, which opens them without requesting anything', async () => {
      const user = userEvent.setup();
      await renderKyc({ verify: denied });

      await acceptAndContinue(user);

      const actions = alertSpy.mock.calls[0]?.[2] as { text: string; onPress?: () => void }[];
      const openSettings = actions.find((action) => action.text === 'Open Settings');
      openSettings?.onPress?.();

      expect(openSettingsSpy).toHaveBeenCalled();
    });
  });

  it.each([
    ['completes', () => Promise.resolve(ok({ type: 'completed' as const }))],
    ['is cancelled', () => Promise.resolve(ok({ type: 'cancelled' as const }))],
    ['fails', () => Promise.resolve(err(offline()))],
  ])('holds the app lock off while the verification flow is open, until it %s', async (_, end) => {
    let finish: (() => void) | undefined;
    const verify: DiditPort['verify'] = () =>
      new Promise((resolve) => {
        finish = () => {
          void end().then(resolve);
        };
      });
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const container = await renderKyc({ verify });
    const appLockHold = container.resolve('appLockHold');

    await acceptAndContinue(user);

    expect(appLockHold.isHeld()).toBe(true);

    await act(async () => {
      finish?.();
    });

    expect(appLockHold.isHeld()).toBe(false);
  });

  it('reports a session that could not be opened', async () => {
    const user = userEvent.setup();
    await renderKyc({ createSession: () => Promise.resolve(err(offline())) });

    await acceptAndContinue(user);

    expect(alertSpy).toHaveBeenCalledWith('We couldn’t start verification. Please try again.');
  });
  describe('skipping verification', () => {
    it('lands on home', async () => {
      const user = userEvent.setup();
      const container = await renderKyc();

      await user.press(screen.getByRole('button', { name: 'Skip for now' }));

      expect(container.resolve('sessionStore').getState().stage).toBe('ready');
    });

    it('remembers that verification was declined', async () => {
      const user = userEvent.setup();
      const container = await renderKyc();

      await user.press(screen.getByRole('button', { name: 'Skip for now' }));

      expect(container.resolve('cache').getString(PreferenceKey.KycSkipped)).toBe('true');
    });

    it('keeps the user signed in', async () => {
      const user = userEvent.setup();
      const container = await renderKyc();

      await user.press(screen.getByRole('button', { name: 'Skip for now' }));

      expect(container.resolve('sessionStore').getState().status).toBe('authenticated');
    });
  });

  it('hands the frame an edge-swipe way out', async () => {
    await renderKyc();
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
});
