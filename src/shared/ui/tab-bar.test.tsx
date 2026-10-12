import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, screen, userEvent } from '@testing-library/react-native';
import { AccessibilityInfo, View } from 'react-native';
import { darkTheme, lightTheme } from '@/core/design-system';
import { renderWithProviders } from '@/test/render-with-providers';
import { TabBar, type TabItem } from './tab-bar';

jest.useFakeTimers();

function glyph(label: string) {
  return function Glyph() {
    return <View accessibilityLabel={label} />;
  };
}

function tabItems(): TabItem[] {
  return [
    {
      id: 'home',
      label: 'Home',
      icon: { active: glyph('home filled'), inactive: glyph('home outline') },
    },
    {
      id: 'wealth',
      label: 'Wealth',
      icon: { active: glyph('wealth filled'), inactive: glyph('wealth outline') },
    },
    {
      id: 'travel',
      label: 'Travel',
      icon: { active: glyph('travel filled'), inactive: glyph('travel outline') },
    },
  ];
}

const tabsRow = () => screen.getByRole('tab', { name: 'Home' }).parent;
const pill = () => tabsRow()?.parent;

function indicator() {
  const [first] = tabsRow()?.children ?? [];

  return typeof first === 'string' ? undefined : first;
}

const ROW_WIDTH = 210;

function renderTabBar(
  overrides: Partial<React.ComponentProps<typeof TabBar>> = {},
  theme: 'light' | 'dark' = 'light',
) {
  const props = {
    items: tabItems(),
    activeId: 'home' as const,
    onSelect: jest.fn(),
    fabLabel: 'Quick actions',
    onPressFab: jest.fn(),
    ...overrides,
  };

  return { props, rendered: renderWithProviders(<TabBar {...props} />, { theme }) };
}

describe('TabBar', () => {
  it('keeps the pill light but puts the action button on the dark surface in dark mode', async () => {
    const { rendered } = renderTabBar({}, 'dark');
    await rendered;

    expect(pill()).toHaveStyle({ backgroundColor: lightTheme.color.bgSurfaceRaised });
    expect(screen.getByRole('button', { name: 'Quick actions' })).toHaveStyle({
      backgroundColor: darkTheme.color.bgSurfaceRaised,
    });
    expect(screen.getByTestId('fab-mark')).toBeOnTheScreen();
  });

  it('paints the action button mark brand blue, which no theme repaints', () => {
    const symbol = readFileSync(join(__dirname, '../../../assets/icons/owego-symbol.svg'), 'utf8');
    const paints = [...symbol.matchAll(/fill="([^"]+)"/g)]
      .map(([, value]) => value)
      .filter((value) => value !== 'none');

    expect(paints.length).toBeGreaterThan(0);
    expect(new Set(paints)).toEqual(new Set([lightTheme.color.fillBrand]));
  });

  it('offers every tab and marks only the current one as selected', async () => {
    const { rendered } = renderTabBar({ activeId: 'wealth' });
    await rendered;

    expect(screen.getByRole('tab', { name: 'Wealth' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Home' })).not.toBeSelected();
    expect(screen.getByRole('tab', { name: 'Travel' })).not.toBeSelected();
  });

  it('reports which tab was pressed', async () => {
    const user = userEvent.setup();
    const { props, rendered } = renderTabBar();
    await rendered;

    await user.press(screen.getByRole('tab', { name: 'Travel' }));

    expect(props.onSelect).toHaveBeenCalledWith('travel');
  });

  it('opens the quick actions from the button beside the pill', async () => {
    const user = userEvent.setup();
    const { props, rendered } = renderTabBar();
    await rendered;

    await user.press(screen.getByRole('button', { name: 'Quick actions' }));

    expect(props.onPressFab).toHaveBeenCalledTimes(1);
  });

  it('keeps both drawings of every tab mounted so they can cross-fade', async () => {
    const { rendered } = renderTabBar({ activeId: 'home' });
    await rendered;

    expect(screen.getByLabelText('home filled')).toBeOnTheScreen();
    expect(screen.getByLabelText('home outline')).toBeOnTheScreen();
    expect(screen.getByLabelText('travel filled')).toBeOnTheScreen();
    expect(screen.getByLabelText('travel outline')).toBeOnTheScreen();
  });

  it('still switches tabs for someone who has asked for less motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const user = userEvent.setup();
    const { props, rendered } = renderTabBar();
    await rendered;

    await user.press(screen.getByRole('tab', { name: 'Wealth' }));

    expect(props.onSelect).toHaveBeenCalledWith('wealth');
    expect(screen.getByLabelText('wealth filled')).toBeOnTheScreen();
  });
});

describe('TabBar geometry', () => {
  it('draws the pill at the same height as the action button beside it', async () => {
    const { rendered } = renderTabBar();
    await rendered;

    expect(pill()).toHaveStyle({ height: lightTheme.size.fab });
    expect(screen.getByRole('button', { name: 'Quick actions' })).toHaveStyle({
      height: lightTheme.size.fab,
      width: lightTheme.size.fab,
    });
  });

  it('sizes the pill to its tabs instead of stretching it across the screen', async () => {
    const { rendered } = renderTabBar();
    await rendered;

    expect(pill()).not.toHaveStyle({ flex: 1 });
    expect(screen.getByRole('tab', { name: 'Home' })).toHaveStyle({
      paddingHorizontal: lightTheme.spacing.xl,
    });
  });

  it('gives every tab the full height of the pill to press', async () => {
    const { rendered } = renderTabBar();
    await rendered;

    expect(tabsRow()).toHaveStyle({ alignItems: 'stretch', flex: 1 });
    expect(screen.getByRole('tab', { name: 'Home' })).toHaveStyle({ justifyContent: 'center' });
  });

  it('centres the indicator inside the top of the pill, over the selected tab', async () => {
    const { rendered } = renderTabBar({ activeId: 'home' });
    await rendered;
    const row = tabsRow();
    if (row === null || row === undefined) throw new Error('no tabs row');

    await fireEvent(row, 'layout', {
      nativeEvent: { layout: { width: ROW_WIDTH, height: lightTheme.size.fab, x: 0, y: 0 } },
    });

    expect(indicator()).toHaveStyle({
      left: 32.5,
      top: lightTheme.spacing.sm - 2,
    });
  });
});
