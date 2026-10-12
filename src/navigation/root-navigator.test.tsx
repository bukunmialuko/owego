import { act, screen } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { ok } from '@/core/result/result';
import BootSplash from 'react-native-bootsplash';
import {
  createSessionStore,
  type OnboardingStage,
  type SessionUser,
} from '@/core/session/session-store';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { REVEAL_DELAY_MS } from '@/features/splash/presentation/hook/use-splash-bootstrap';
import { RootNavigator } from './root-navigator';
import { KycState } from '@/core/session/onboarding-gate';

jest.useFakeTimers();

const USER: SessionUser = { id: 'u1', firstName: 'Ada', kycState: KycState.Approved };

async function renderAt(
  status: 'booting' | 'authenticated' | 'unauthenticated',
  stage: OnboardingStage = 'ready',
) {
  const sessionStore = createSessionStore();
  if (status === 'authenticated') sessionStore.getState().signedIn(USER, stage);
  if (status === 'unauthenticated') sessionStore.getState().signedOut();

  await renderWithProviders(<RootNavigator />, {
    container: createTestContainer({ sessionStore: asValue(sessionStore) }),
  });

  return sessionStore;
}

describe('RootNavigator', () => {
  describe('booting', () => {
    it('shows the brand mark immediately, and nothing else', async () => {
      await renderAt('booting');

      expect(screen.getByLabelText('owego')).toBeTruthy();
      expect(screen.queryByRole('progressbar')).toBeNull();
    });

    it('reveals the progress bar once the delay has passed', async () => {
      await renderAt('booting');

      await act(async () => {
        jest.advanceTimersByTime(REVEAL_DELAY_MS);
      });

      expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
    });

    it('does not render the auth stack while booting', async () => {
      await renderAt('booting');

      expect(screen.queryByText('Money without Borders')).toBeNull();
    });
  });

  it('sends an unauthenticated user to the auth landing', async () => {
    await renderAt('unauthenticated');

    expect(await screen.findByText('Money without Borders')).toBeTruthy();
  });

  describe('onboarding stages', () => {
    it('shows kyc', async () => {
      await renderAt('authenticated', 'kyc');

      expect(await screen.findByText("You're in!")).toBeTruthy();
    });

    it('shows wallet setup for an account with no wallet', async () => {
      const sessionStore = createSessionStore();
      sessionStore.getState().signedIn(USER, 'create-wallet');

      await renderWithProviders(<RootNavigator />, {
        container: createTestContainer({
          sessionStore: asValue(sessionStore),
          walletRepository: asValue({
            getWallets: () => Promise.resolve(ok([])),
            createChallenge: jest.fn(),
            createPinChangeChallenge: jest.fn(),
          }),
        }),
      });

      expect(await screen.findByText('Setup Wallet Pin')).toBeTruthy();
    });

    it('shows the unlock screen when the session is locked', async () => {
      await renderAt('authenticated', 'locked');

      expect(await screen.findByText('Welcome back, Ada')).toBeTruthy();
    });
  });

  it('shows the app once onboarding is done', async () => {
    await renderAt('authenticated', 'ready');

    expect(screen.queryByText("You're in!")).toBeNull();
  });

  describe('the native splash', () => {
    beforeEach(() => {
      jest.mocked(BootSplash.hide).mockClear();
    });

    it('is dismissed once the first javascript frame has painted', async () => {
      await renderAt('booting');

      expect(BootSplash.hide).toHaveBeenCalledWith({ fade: true });
    });
  });
});
