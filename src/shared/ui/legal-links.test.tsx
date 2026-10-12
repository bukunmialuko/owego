import { Linking } from 'react-native';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { renderWithProviders } from '@/test/render-with-providers';
import { LegalLinks, openLegalDocument } from './legal-links';

jest.useFakeTimers();

let openUrl: jest.SpyInstance;

beforeEach(() => {
  jest.mocked(InAppBrowser.isAvailable).mockResolvedValue(true);
  jest.mocked(InAppBrowser.open).mockClear();
  openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
});

afterEach(() => {
  openUrl.mockRestore();
});

describe('LegalLinks', () => {
  it('opens the terms in the in-app browser', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderWithProviders(<LegalLinks prefix="By continuing you agree to our" />);

    await user.press(screen.getByText('Terms of Use'));

    await waitFor(() => {
      expect(InAppBrowser.open).toHaveBeenCalledWith('https://www.owego.app/terms-of-use');
    });
  });

  it('opens the privacy policy in the in-app browser', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderWithProviders(<LegalLinks prefix="By continuing you agree to our" />);

    await user.press(screen.getByText('Privacy Policy'));

    await waitFor(() => {
      expect(InAppBrowser.open).toHaveBeenCalledWith('https://www.owego.app/privacy-policy');
    });
  });
});

describe('openLegalDocument', () => {
  it('falls back to the system browser when the in-app one is unavailable', async () => {
    jest.mocked(InAppBrowser.isAvailable).mockResolvedValue(false);

    await openLegalDocument('privacy');

    expect(openUrl).toHaveBeenCalledWith('https://www.owego.app/privacy-policy');
  });
});
