import { screen, userEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test/render-with-providers';
import { BiometricOffer, type BiometricOfferKind } from './biometric-offer';

jest.useFakeTimers();

async function renderOffer(kind: BiometricOfferKind, isBusy = false) {
  const onEnable = jest.fn();
  const onDecline = jest.fn();

  await renderWithProviders(
    <BiometricOffer kind={kind} onEnable={onEnable} onDecline={onDecline} isBusy={isBusy} />,
  );

  return {
    onEnable,
    onDecline,
    user: userEvent.setup({ advanceTimers: jest.advanceTimersByTime }),
  };
}

describe('BiometricOffer', () => {
  it.each<[BiometricOfferKind, string, string]>([
    ['face-id', 'Use Face ID to get back in?', 'Use Face ID'],
    ['touch-id', 'Use Touch ID to get back in?', 'Use Touch ID'],
    ['biometrics', 'Use your fingerprint or face to get back in?', 'Use biometrics'],
  ])('names %s in its title and its button', async (kind, title, action) => {
    await renderOffer(kind);

    expect(screen.getByText(title)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: action })).toBeOnTheScreen();
  });

  it('says the PIN keeps working either way', async () => {
    await renderOffer('face-id');

    expect(
      screen.getByText(
        'It’s quicker than typing your PIN, and your PIN still works whenever it isn’t.',
      ),
    ).toBeOnTheScreen();
  });

  it('enables and declines', async () => {
    const { onEnable, onDecline, user } = await renderOffer('face-id');

    await user.press(screen.getByRole('button', { name: 'Use Face ID' }));
    await user.press(screen.getByRole('button', { name: 'Not now' }));

    expect(onEnable).toHaveBeenCalledTimes(1);
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it('holds both buttons while busy', async () => {
    const { onEnable, onDecline, user } = await renderOffer('face-id', true);

    await user.press(screen.getByRole('button', { name: 'Use Face ID' }));
    await user.press(screen.getByRole('button', { name: 'Not now' }));

    expect(onEnable).not.toHaveBeenCalled();
    expect(onDecline).not.toHaveBeenCalled();
  });
});
