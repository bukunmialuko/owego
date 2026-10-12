import { screen, userEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test/render-with-providers';
import { Banner } from './banner';

jest.useFakeTimers();

describe('Banner', () => {
  it('announces itself as an alert rather than waiting to be swiped to', async () => {
    await renderWithProviders(<Banner message="Wallet setup is unavailable" />);

    expect(await screen.findByRole('alert')).toBeOnTheScreen();
  });

  describe('the action', () => {
    it('offers the action and runs it when pressed', async () => {
      const onPress = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      await renderWithProviders(
        <Banner
          message="Wallet setup is unavailable"
          action={{ label: 'Contact support', onPress }}
        />,
      );

      await user.press(await screen.findByRole('button', { name: 'Contact support' }));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('renders no action control when none is given', async () => {
      await renderWithProviders(<Banner message="Wallet setup is unavailable" />);

      expect(screen.queryByRole('button')).toBeNull();
    });

    it('coexists with dismiss', async () => {
      const onDismiss = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      await renderWithProviders(
        <Banner
          message="Wallet setup is unavailable"
          action={{ label: 'Contact support', onPress: jest.fn() }}
          dismissLabel="Dismiss"
          onDismiss={onDismiss}
        />,
      );

      await user.press(await screen.findByRole('button', { name: 'Dismiss' }));

      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: 'Contact support' })).toBeOnTheScreen();
    });
  });
});
