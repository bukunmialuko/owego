import { screen, userEvent } from '@testing-library/react-native';
import { darkTheme, lightTheme } from '@/core/design-system';
import { renderWithProviders } from '@/test/render-with-providers';
import { CreditLineCard } from './credit-line-card';

jest.useFakeTimers();

const THEME = { light: lightTheme, dark: darkTheme } as const;

function renderCard(options: { theme?: 'light' | 'dark'; onPress?: () => void } = {}) {
  return renderWithProviders(
    <CreditLineCard limit="$500" onPress={options.onPress ?? jest.fn()} />,
    { theme: options.theme ?? 'light' },
  );
}

function artwork() {
  const found: unknown[] = [];

  const walk = (node: unknown): void => {
    if (node === null || typeof node !== 'object') return;
    const n = node as { props?: Record<string, unknown>; children?: unknown[] };
    if (typeof n.props?.['width'] === 'number') found.push(n.props);
    n.children?.forEach(walk);
  };

  walk(screen.toJSON());

  return found;
}

describe('CreditLineCard', () => {
  it.each(['light', 'dark'] as const)('sets its offer in primary text in %s mode', async (mode) => {
    await renderCard({ theme: mode });

    expect(await screen.findByText(/Borrow up to/)).toHaveStyle({
      color: THEME[mode].color.textPrimary,
    });
    expect(screen.getByText('$500')).toHaveStyle({ color: THEME[mode].color.textPrimary });
  });

  it.each(['light', 'dark'] as const)('draws the artwork in %s mode', async (theme) => {
    await renderCard({ theme });

    expect(artwork()).toHaveLength(1);
  });

  it.each(['light', 'dark'] as const)(
    'grounds the card on the colour its artwork was drawn for in %s mode',
    async (theme) => {
      await renderCard({ theme });

      expect(screen.getByRole('button', { name: 'Activate credit line' })).toHaveStyle({
        backgroundColor: THEME[theme].color.fillPromoCredit,
      });
    },
  );

  it('offers the borrowing limit', async () => {
    await renderCard();

    expect(screen.getByText('$500')).toBeOnTheScreen();
  });

  it('runs its action when pressed', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderCard({ onPress });

    await user.press(screen.getByRole('button', { name: 'Activate credit line' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
