import { fireEvent, screen, userEvent, within } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { StyleSheet } from 'react-native';
import { darkTheme, lightTheme } from '@/core/design-system';
import { ok } from '@/core/result/result';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { AppearanceSheet } from './appearance-sheet';

jest.useFakeTimers();

const WINDOW = { width: 750, height: 1334 };
const SHEET_CAP = WINDOW.height * 0.8;
const PATTERN_HEIGHT = (WINDOW.width * 533) / 393;

const noPayees = { getRecent: () => Promise.resolve(ok([])) };

async function renderSheet(
  overrides: Parameters<typeof createTestContainer>[0] = {},
  theme: 'light' | 'dark' = 'light',
) {
  const user = userEvent.setup();
  const onClose = jest.fn();

  await renderWithProviders(<AppearanceSheet isOpen onClose={onClose} />, {
    container: createTestContainer(overrides),
    theme,
  });

  return { user, onClose };
}

type HostElement = ReturnType<typeof screen.getByText>;

function scrollViewAround(element: HostElement): HostElement {
  let node: HostElement | null = element.parent;
  while (node !== null && node.type !== 'RCTScrollView') node = node.parent;
  if (node === null) throw new Error('expected a scroll view around the element');
  return node;
}

function swatchOf(label: string): HostElement {
  const swatch = screen.getByText(label).parent?.children[0];
  if (swatch === undefined || typeof swatch === 'string') throw new Error(`no swatch for ${label}`);
  return swatch;
}

describe('AppearanceSheet', () => {
  it('offers the three appearances the designs draw', async () => {
    await renderSheet();

    for (const label of ['Day', 'Night', 'System']) {
      expect(await screen.findByRole('radio', { name: label })).toBeOnTheScreen();
    }
  });

  it('marks the current appearance as chosen', async () => {
    await renderSheet();

    expect(await screen.findByRole('radio', { name: 'Day' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Night' })).not.toBeChecked();
  });

  it('switches the appearance when one is picked', async () => {
    const { user } = await renderSheet();

    await user.press(await screen.findByRole('radio', { name: 'Night' }));

    expect(await screen.findByRole('radio', { name: 'Night' })).toBeChecked();
  });

  it('lines the three tiles up along their tops', async () => {
    await renderSheet();

    const day = await screen.findByRole('radio', { name: 'Day' });
    const row = day.parent;

    expect(screen.getByRole('radio', { name: 'System' }).parent).toBe(row);
    expect(row).toHaveStyle({ alignItems: 'flex-start' });
  });

  const hidden = { includeHiddenElements: true } as const;

  it('shows a preview of the dashboard', async () => {
    await renderSheet();

    expect(await screen.findByText('Available balance', hidden)).toBeOnTheScreen();
    expect(screen.getByText('Make payment', hidden)).toBeOnTheScreen();
  });

  it('previews the quick-send row when there is someone to send to', async () => {
    await renderSheet();

    expect(await screen.findByText('Quick send', hidden)).toBeOnTheScreen();
  });

  it('skips the quick-send row entirely when there is nobody to send to', async () => {
    await renderSheet({ payeePort: asValue(noPayees) });

    expect(await screen.findByText('Available balance', hidden)).toBeOnTheScreen();
    expect(screen.queryByText('Quick send', hidden)).not.toBeOnTheScreen();
  });

  it('previews the scan-to-pay shortcut in the header, not Earn or notifications', async () => {
    await renderSheet();

    expect(
      await screen.findByRole('button', { name: 'Scan to pay', includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/Earn/, hidden)).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Notifications', includeHiddenElements: true }),
    ).not.toBeOnTheScreen();
  });

  it('prints the balance as the dashboard does, cents a tier down, over the converted figure', async () => {
    await renderSheet();

    expect(await screen.findByText('.98', hidden)).toHaveStyle({
      fontSize: lightTheme.typography['numeric.m'].fontSize,
    });
    expect(screen.getByText('$5,136.98', hidden)).toHaveStyle({
      fontSize: lightTheme.typography['numeric.xl'].fontSize,
    });
    expect(screen.getByText('£3,817.55', hidden)).toBeOnTheScreen();
  });

  it('ends the preview just below the dashboard it shrinks, so the payees are never cut off', async () => {
    await renderSheet();

    const dashboard = await screen.findByTestId('previewed-dashboard', hidden);
    await fireEvent(dashboard, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 750, height: 520 } },
    });

    expect(dashboard.parent?.parent).toHaveStyle({
      height: (520 + lightTheme.spacing.xs) * (342 / 393),
    });
  });

  async function layOut({ dashboard, bodyTop, footer }: Record<string, number>) {
    const content = await screen.findByTestId('previewed-dashboard', hidden);
    const at = (y: number, height: number) => ({
      nativeEvent: { layout: { x: 0, y, width: WINDOW.width, height } },
    });

    await fireEvent(content, 'layout', at(0, dashboard ?? 0));
    const body = scrollViewAround(content).parent;
    const pinned = screen.getByRole('radio', { name: 'Day' }).parent?.parent;
    if (body == null || pinned == null) throw new Error('expected the sheet body and footer');
    await fireEvent(body, 'layout', at(bodyTop ?? 0, 0));
    await fireEvent(pinned, 'layout', at(0, footer ?? 0));

    const card = content.parent?.parent;
    if (card == null) throw new Error('expected the preview card');
    return StyleSheet.flatten(card.props['style']) as { width: number; height: number };
  }

  it('shrinks the preview further to fit a sheet with less room than it needs', async () => {
    await renderSheet();

    const card = await layOut({ dashboard: 520, bodyTop: 88, footer: 900 });

    const room = SHEET_CAP - 88 - 900;
    expect(card.height).toBeCloseTo(room);
    expect(card.width).toBeCloseTo((WINDOW.width * room) / (520 + lightTheme.spacing.xs));
  });

  it('keeps the preview on the pattern when the pattern ends before the sheet does', async () => {
    await renderSheet();

    const card = await layOut({ dashboard: 520, bodyTop: 900, footer: 10 });

    expect(card.height).toBeCloseTo(PATTERN_HEIGHT - 900);
  });

  it.each([
    ['light', lightTheme],
    ['dark', darkTheme],
  ] as const)(
    'lays the owego-mark pattern on the faint brand ground in %s mode',
    async (theme, tokens) => {
      await renderSheet({}, theme);

      const pattern = await screen.findByTestId('appearance-pattern', hidden);
      expect(pattern.parent).toHaveStyle({ backgroundColor: tokens.color.fillBrandFaint });
    },
  );

  it('keeps the choices pinned outside the scrolling preview', async () => {
    await renderSheet();

    const preview = scrollViewAround(await screen.findByText('Available balance', hidden));

    expect(within(preview).queryByRole('radio', { name: 'Day' })).not.toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Day' })).toBeOnTheScreen();
  });

  it.each([
    ['light', lightTheme, 'Day', 'Night'],
    ['dark', darkTheme, 'Night', 'Day'],
  ] as const)(
    'washes the chosen tile faint brand and leaves the others edgeless in %s mode',
    async (theme, tokens, chosen, other) => {
      await renderSheet({}, theme);
      await screen.findByRole('radio', { name: chosen });

      expect(swatchOf(chosen)).toHaveStyle({
        backgroundColor: tokens.color.fillBrandFaint,
        borderColor: tokens.color.borderBrandSubtle,
      });
      expect(swatchOf(other)).toHaveStyle({
        backgroundColor: tokens.color.fillNeutralSubtle,
        borderColor: 'transparent',
      });
      for (const label of ['Day', 'Night', 'System']) {
        expect(screen.getByText(label)).toHaveStyle({ color: tokens.color.textSecondary });
      }
    },
  );

  it('draws the close button as a disc over the pattern', async () => {
    await renderSheet();

    const [, disc] = await screen.findAllByRole('button', { name: 'Close' });
    expect(disc).toHaveStyle({ backgroundColor: lightTheme.color.fillOnTint });
  });
});
