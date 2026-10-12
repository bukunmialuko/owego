import { screen } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { lightTheme } from '@/core/design-system';
import { createSessionStore, type SessionUser } from '@/core/session/session-store';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { HomeHeader } from './home-header';
import { KycState } from '@/core/session/onboarding-gate';

const ADA: SessionUser = { id: 'u1', firstName: 'Ada', kycState: KycState.Approved };

function noop() {}

function header(name = 'Ada') {
  return <HomeHeader name={name} onPressProfile={noop} onPressScan={noop} />;
}

function coralAccount() {
  const sessionStore = createSessionStore();
  sessionStore.getState().signedIn(ADA, 'ready');
  const container = createTestContainer({ sessionStore: asValue(sessionStore) });
  container.cradle.avatarAppearanceStore.getState().save({ kind: 'initials', swatch: 'coral' });

  return container;
}

describe('HomeHeader', () => {
  it('shows the silhouette until the account chooses a colour', async () => {
    await renderWithProviders(header());

    expect(
      screen.getByTestId('avatar-silhouette', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  it("draws the account's initial on the colour it chose", async () => {
    await renderWithProviders(header(), { container: coralAccount() });

    expect((await screen.findByText('A')).parent).toHaveStyle({
      backgroundColor: lightTheme.color.fillAvatarCoral,
    });
  });

  it('shows only the first initial, even for a first name of two words', async () => {
    await renderWithProviders(header('Mary Ann'), { container: coralAccount() });

    expect(await screen.findByText('M')).toBeOnTheScreen();
    expect(screen.queryByText('MA')).toBeNull();
  });
});
