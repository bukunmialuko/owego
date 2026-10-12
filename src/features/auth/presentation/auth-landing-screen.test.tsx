import { screen } from '@testing-library/react-native';
import { lightTheme } from '@/core/design-system';
import { renderWithProviders } from '@/test/render-with-providers';
import { AuthLandingScreen } from './auth-landing-screen';

type Element = ReturnType<typeof screen.getByText>;

function firstChild(node: Element | null, expected: string): Element {
  const [child] = node?.children ?? [];
  if (child === undefined || typeof child === 'string') throw new Error(`expected ${expected}`);

  return child;
}

function landing() {
  const container = firstChild(firstChild(screen.root, 'the safe-area provider'), 'the screen');

  return { container, photograph: firstChild(container, 'the background photograph') };
}

describe('AuthLandingScreen', () => {
  const overTheScrim = [
    'Money without Borders',
    'Stablecoin spend, Global Payouts, Yields & Earning, In one wallet',
    'By continuing you agree to our',
    'Terms of Use',
    'Privacy Policy',
  ];

  it.each(['light', 'dark'] as const)(
    'keeps the copy over the scrim white in %s mode',
    async (theme) => {
      await renderWithProviders(<AuthLandingScreen />, { theme });

      for (const copy of overTheScrim) {
        expect(screen.getByText(copy)).toHaveStyle({ color: lightTheme.color.textOnScrim });
      }
    },
  );

  it.each(['light', 'dark'] as const)(
    'keeps the controls over the scrim light in %s mode',
    async (theme) => {
      await renderWithProviders(<AuthLandingScreen />, { theme });

      expect(screen.getByRole('button', { name: /^Country, / })).toHaveStyle({
        backgroundColor: lightTheme.color.bgSurface,
      });
      expect(screen.getByRole('button', { name: 'Continue with Google' })).toHaveStyle({
        backgroundColor: lightTheme.color.fillNeutral,
      });
      expect(screen.getByText('Continue with Google')).toHaveStyle({
        color: lightTheme.color.textPrimary,
      });
    },
  );

  it.each(['light', 'dark'] as const)('paints a ground of its own in %s mode', async (theme) => {
    await renderWithProviders(<AuthLandingScreen />, { theme });

    expect(landing().container).toHaveStyle({ backgroundColor: lightTheme.color.bgPhoto });
  });

  it('sizes the photograph to the frame rather than to its own dimensions', async () => {
    await renderWithProviders(<AuthLandingScreen />);

    expect(landing().photograph).toHaveStyle({ height: '100%', width: '100%' });
  });
});
