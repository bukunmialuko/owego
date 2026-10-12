import { screen, userEvent } from '@testing-library/react-native';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { CurrencySheet } from './currency-sheet';

jest.useFakeTimers();

async function renderSheet() {
  const user = userEvent.setup();
  const onClose = jest.fn();

  await renderWithProviders(<CurrencySheet isOpen onClose={onClose} />, {
    container: createTestContainer(),
  });

  return { user, onClose };
}

describe('CurrencySheet', () => {
  it('explains what the choice does', async () => {
    await renderSheet();

    expect(await screen.findByText('Your balances are held in stablecoins')).toBeOnTheScreen();
  });

  it('offers the display currencies', async () => {
    await renderSheet();

    for (const name of ['US Dollar', 'Nigerian Naira', 'Kenyan Shilling']) {
      expect(await screen.findByText(name)).toBeOnTheScreen();
    }
  });

  it('does not offer a currency the app does not support', async () => {
    await renderSheet();

    expect(await screen.findByText('US Dollar')).toBeOnTheScreen();
    expect(screen.queryByText('British Pound')).toBeNull();
  });

  it('ticks US Dollar before anything has been picked', async () => {
    await renderSheet();

    expect(await screen.findByRole('button', { name: /US Dollar/ })).toBeSelected();
  });

  it('remembers the currency that was picked', async () => {
    const { user } = await renderSheet();

    await user.press(await screen.findByRole('button', { name: /Nigerian Naira/ }));

    expect(await screen.findByRole('button', { name: /Nigerian Naira/ })).toBeSelected();
  });

  it('closes once a currency is chosen', async () => {
    const { user, onClose } = await renderSheet();

    await user.press(await screen.findByRole('button', { name: /US Dollar/ }));

    expect(onClose).toHaveBeenCalled();
  });
});
