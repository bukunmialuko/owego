import { NavigationContainer } from '@react-navigation/native';
import { screen } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { ok } from '@/core/result/result';
import { createSessionStore, type SessionUser } from '@/core/session/session-store';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { OnboardingNavigator } from './onboarding-navigator';
import { KycState } from '@/core/session/onboarding-gate';

jest.useFakeTimers();

const USER: SessionUser = { id: 'u1', firstName: 'Ada', kycState: KycState.Approved };

async function renderAt(stage: Parameters<typeof OnboardingNavigator>[0]['stage']) {
  const sessionStore = createSessionStore();
  sessionStore.getState().signedIn(USER, stage);

  const view = await renderWithProviders(
    <NavigationContainer>
      <OnboardingNavigator stage={stage} />
    </NavigationContainer>,
    {
      container: createTestContainer({
        sessionStore: asValue(sessionStore),
        walletRepository: asValue({
          getWallets: () => Promise.resolve(ok([])),
          createChallenge: jest.fn(),
          createPinChangeChallenge: jest.fn(),
        }),
      }),
    },
  );

  return view;
}

describe('OnboardingNavigator', () => {
  it('shows the kyc screen at the kyc stage', async () => {
    await renderAt('kyc');

    expect(await screen.findByText("You're in!")).toBeOnTheScreen();
  });

  it('shows wallet setup at the create-wallet stage', async () => {
    await renderAt('create-wallet');

    expect(await screen.findByText('Setup Wallet Pin')).toBeOnTheScreen();
  });

  it('does not keep the kyc screen registered once past it', async () => {
    await renderAt('create-wallet');

    await screen.findByText('Setup Wallet Pin');
    expect(screen.queryByText("You're in!")).toBeNull();
  });

  it('swaps the screen when the stage advances', async () => {
    const { rerender } = await renderAt('kyc');

    await screen.findByText("You're in!");
    await rerender(
      <NavigationContainer>
        <OnboardingNavigator stage="create-wallet" />
      </NavigationContainer>,
    );

    expect(await screen.findByText('Setup Wallet Pin')).toBeOnTheScreen();
    expect(screen.queryByText("You're in!")).toBeNull();
  });
});
