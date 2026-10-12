import { screen } from '@testing-library/react-native';
import { lightTheme } from '@/core/design-system';
import { renderWithProviders } from '@/test/render-with-providers';
import { ScreenHeader } from './screen-header';

describe('ScreenHeader', () => {
  it('keeps the height of its controls when it has none', async () => {
    await renderWithProviders(<ScreenHeader title="Confirm payment" />);

    expect(screen.getByText('Confirm payment').parent).toHaveStyle({
      minHeight: lightTheme.size.control.md,
    });
  });

  it('names back "Back" and close "Close", so a screen reader can tell them apart', async () => {
    await renderWithProviders(
      <ScreenHeader title="Confirm payment" onBack={jest.fn()} onClose={jest.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Back' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Close' })).toBeOnTheScreen();
  });

  it('puts a leading close where the back control would be', async () => {
    await renderWithProviders(
      <ScreenHeader title="Make payment" closePosition="leading" onClose={jest.fn()} />,
    );

    const close = screen.getByRole('button', { name: 'Close' });

    expect(close.parent?.children.indexOf(close)).toBe(0);
  });
});
