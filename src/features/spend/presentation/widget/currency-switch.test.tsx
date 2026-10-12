import { screen, userEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test/render-with-providers';
import { CurrencySwitch } from './currency-switch';

jest.useFakeTimers();

describe('CurrencySwitch', () => {
  it('shows the code of the currency being typed, and names the one it switches to', async () => {
    await renderWithProviders(
      <CurrencySwitch currency="USD" label="Switch to NGN" onPress={jest.fn()} />,
    );

    expect(await screen.findByRole('button', { name: 'Switch to NGN' })).toBeOnTheScreen();
    expect(screen.getByText('USD')).toBeOnTheScreen();
  });

  it('switches when pressed', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await renderWithProviders(
      <CurrencySwitch currency="USD" label="Switch to NGN" onPress={onPress} />,
    );

    await user.press(await screen.findByRole('button', { name: 'Switch to NGN' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('announces itself unavailable and ignores a press until it can switch', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await renderWithProviders(
      <CurrencySwitch currency="USD" label="Switch to NGN" disabled onPress={onPress} />,
    );

    const button = await screen.findByRole('button', { name: 'Switch to NGN' });
    await user.press(button);

    expect(button).toBeDisabled();
    expect(onPress).not.toHaveBeenCalled();
  });
});
