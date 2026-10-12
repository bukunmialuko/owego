import { screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { lightTheme } from '@/core/design-system';
import { serverError } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import { createSessionStore, type SessionUser } from '@/core/session/session-store';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { EditProfileScreen } from './edit-profile-screen';
import { KycState } from '@/core/session/onboarding-gate';

jest.useFakeTimers();

const ADA: SessionUser = { id: 'u1', firstName: 'Ada', kycState: KycState.Approved };

async function renderScreen(container = createTestContainer()) {
  return renderWithProviders(<EditProfileScreen />, { withNavigation: true, container });
}

function signedInContainer() {
  const sessionStore = createSessionStore();
  sessionStore.getState().signedIn(ADA, 'ready');

  return createTestContainer({ sessionStore: asValue(sessionStore) });
}

describe('EditProfileScreen', () => {
  it('shows the details the account actually has', async () => {
    await renderScreen();

    expect(await screen.findByText('Precious Jameson')).toBeOnTheScreen();
    expect(screen.getByText('precious.james@gmail.com')).toBeOnTheScreen();
    expect(screen.getByText('+234 0123 456 7890')).toBeOnTheScreen();
    expect(screen.getByText('Nigeria')).toBeOnTheScreen();
  });

  it('renders every row the design lists', async () => {
    await renderScreen();

    for (const label of [
      'Name',
      'Email',
      'Phone number',
      'Gender',
      'Date of birth',
      'Address',
      'Country',
    ]) {
      expect(await screen.findByText(label)).toBeOnTheScreen();
    }
  });

  it('marks the three the backend does not send', async () => {
    await renderScreen();

    expect(await screen.findAllByText('—')).toHaveLength(3);
  });

  it('says how to change any of it', async () => {
    await renderScreen();

    expect(await screen.findByText(/please contact us at/)).toBeOnTheScreen();
    expect(screen.getByText(/support@ribhfinance\.com/)).toBeOnTheScreen();
  });

  describe('the avatar', () => {
    it('shows the silhouette until a colour is chosen', async () => {
      await renderScreen();

      await screen.findByText('Precious Jameson');
      expect(
        screen.getByTestId('avatar-silhouette', { includeHiddenElements: true }),
      ).toBeOnTheScreen();
    });

    it('opens the avatar picker from Change avatar', async () => {
      const user = userEvent.setup();
      await renderScreen();

      await screen.findByText('Precious Jameson');
      await user.press(screen.getByRole('button', { name: 'Change avatar' }));

      expect(await screen.findByRole('header', { name: 'Change avatar' })).toBeOnTheScreen();
    });

    it('keeps Change avatar disabled while the profile cannot load', async () => {
      await renderScreen(
        createTestContainer({
          settingsProfilePort: asValue({
            loadSettingsProfile: () => Promise.resolve(err(serverError())),
          }),
        }),
      );

      expect(await screen.findAllByText('—')).toHaveLength(7);
      expect(screen.getByRole('button', { name: 'Change avatar' })).toBeDisabled();
    });

    it('keeps Change avatar disabled for an account with no name', async () => {
      await renderScreen(
        createTestContainer({
          settingsProfilePort: asValue({
            loadSettingsProfile: () =>
              Promise.resolve(
                ok({
                  firstName: '',
                  lastName: '',
                  email: 'nameless@example.com',
                  phone: '',
                  country: 'ng',
                  kycState: '',
                  pictureUrl: '',
                }),
              ),
          }),
        }),
      );

      expect(await screen.findByText('nameless@example.com')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Change avatar' })).toBeDisabled();
    });

    it('draws the chosen colour on the avatar after saving', async () => {
      const user = userEvent.setup();
      await renderScreen(signedInContainer());

      await screen.findByText('Precious Jameson');
      await user.press(screen.getByRole('button', { name: 'Change avatar' }));
      await user.press(await screen.findByRole('radio', { name: 'Coral' }));
      await user.press(screen.getByRole('button', { name: 'Save' }));

      expect(screen.queryByRole('header', { name: 'Change avatar' })).toBeNull();
      expect((await screen.findByText('PJ')).parent).toHaveStyle({
        backgroundColor: lightTheme.color.fillAvatarCoral,
      });
    });
  });
});
