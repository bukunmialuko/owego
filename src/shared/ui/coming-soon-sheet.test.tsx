import { screen, userEvent } from '@testing-library/react-native';
import { lightTheme } from '@/core/design-system';
import { renderWithProviders } from '@/test/render-with-providers';
import { ComingSoonSheet } from './coming-soon-sheet';

describe('ComingSoonSheet', () => {
  it('says the feature is on its way', async () => {
    await renderWithProviders(<ComingSoonSheet isOpen onClose={jest.fn()} />);

    expect(screen.getByRole('header', { name: 'Coming Soon!' })).toBeOnTheScreen();
    expect(screen.getByText("We're on it and will have it ready for you soon!")).toBeOnTheScreen();
  });

  it('shows nothing while closed', async () => {
    await renderWithProviders(<ComingSoonSheet isOpen={false} onClose={jest.fn()} />);

    expect(screen.queryByText('Coming Soon!')).toBeNull();
  });

  it('closes from its close button and from the scrim', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    await renderWithProviders(<ComingSoonSheet isOpen onClose={onClose} />);

    for (const control of screen.getAllByRole('button', { name: 'Close' })) {
      await user.press(control);
    }

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('stays on its pastel ground in dark mode, the only one its artwork was drawn for', async () => {
    await renderWithProviders(<ComingSoonSheet isOpen onClose={jest.fn()} />, { theme: 'dark' });

    expect(screen.getByText('Coming Soon!')).toHaveStyle({ color: lightTheme.color.textPrimary });
  });
});
