import { act, screen } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { lightTheme } from '@/core/design-system';
import { createSessionStore, type SessionUser } from '@/core/session/session-store';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { AccountAvatar } from './account-avatar';
import { KycState } from '@/core/session/onboarding-gate';

const ADA: SessionUser = { id: 'u1', firstName: 'Ada', kycState: KycState.Approved };

function coralAccount() {
  const sessionStore = createSessionStore();
  sessionStore.getState().signedIn(ADA, 'ready');
  const container = createTestContainer({ sessionStore: asValue(sessionStore) });
  container.cradle.avatarAppearanceStore.getState().save({ kind: 'initials', swatch: 'coral' });

  return container;
}

const silhouette = () => screen.queryByTestId('avatar-silhouette', { includeHiddenElements: true });

describe('AccountAvatar', () => {
  it('shows the silhouette until the account chooses a colour', async () => {
    await renderWithProviders(<AccountAvatar name="Ada Lovelace" size="lg" />);

    expect(silhouette()).toBeOnTheScreen();
    expect(screen.queryByText('AL')).toBeNull();
  });

  it("draws the account's initials on its chosen colour", async () => {
    await renderWithProviders(<AccountAvatar name="Ada Lovelace" size="lg" />, {
      container: coralAccount(),
    });

    expect((await screen.findByText('AL')).parent).toHaveStyle({
      backgroundColor: lightTheme.color.fillAvatarCoral,
    });
    expect(silhouette()).toBeNull();
  });

  it('shows the silhouette until the name arrives, even with a saved colour', async () => {
    await renderWithProviders(<AccountAvatar name=" " size="lg" />, {
      container: coralAccount(),
    });

    expect(silhouette()).toBeOnTheScreen();
    expect(screen.queryByText('?')).toBeNull();
  });

  it('redraws when the account saves a different colour', async () => {
    const container = coralAccount();
    await renderWithProviders(<AccountAvatar name="Ada Lovelace" size="lg" />, { container });
    await screen.findByText('AL');

    await act(async () => {
      container.cradle.avatarAppearanceStore.getState().save({ kind: 'initials', swatch: 'mint' });
    });

    expect(screen.getByText('AL').parent).toHaveStyle({
      backgroundColor: lightTheme.color.fillAvatarMint,
    });
  });
});
