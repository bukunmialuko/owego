import { PanResponder, Platform, Text as RNText, View } from 'react-native';
import { screen } from '@testing-library/react-native';
import { lightTheme } from '@/core/design-system';
import { ancestorsOf } from '@/test/ancestors-of';
import { renderWithProviders } from '@/test/render-with-providers';
import { createBackSwipeConfig } from '@/core/session/back-swipe';
import { Screen } from './screen';

jest.useFakeTimers();

const child = <RNText testID="child">Content</RNText>;

function nodesWithResponder(): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];

  const walk = (node: unknown): void => {
    if (node === null || typeof node !== 'object') return;
    const candidate = node as { props?: Record<string, unknown>; children?: unknown[] };
    if (typeof candidate.props?.['onMoveShouldSetResponder'] === 'function')
      found.push(candidate.props);
    candidate.children?.forEach(walk);
  };

  walk(screen.toJSON());

  return found;
}

describe('Screen', () => {
  it('renders its children', async () => {
    await renderWithProviders(<Screen>{child}</Screen>);

    expect(await screen.findByTestId('child')).toBeOnTheScreen();
  });

  it.each(['plain', 'surface'] as const)('renders the %s variant', async (variant) => {
    await renderWithProviders(<Screen variant={variant}>{child}</Screen>);

    expect(await screen.findByTestId('child')).toBeOnTheScreen();
  });

  it('fades a surface page into its own surface above the tab bar', async () => {
    await renderWithProviders(
      <Screen variant="surface" hasTabBar>
        {child}
      </Screen>,
      { theme: 'dark' },
    );

    await screen.findByTestId('child');
    expect(JSON.stringify(screen.toJSON())).toContain('"name":"bottomFadeSurface"');
  });

  it('renders a footer alongside the content', async () => {
    await renderWithProviders(
      <Screen footer={<RNText testID="footer">Continue</RNText>}>{child}</Screen>,
    );

    expect(await screen.findByTestId('footer')).toBeOnTheScreen();
    expect(screen.getByTestId('child')).toBeOnTheScreen();
  });

  it('renders a backdrop behind the content', async () => {
    await renderWithProviders(<Screen backdrop={<View testID="backdrop" />}>{child}</Screen>);

    expect(await screen.findByTestId('backdrop')).toBeOnTheScreen();
  });

  describe('when scrolling', () => {
    it('still renders its children', async () => {
      await renderWithProviders(<Screen scroll>{child}</Screen>);

      expect(await screen.findByTestId('child')).toBeOnTheScreen();
    });
  });

  it('renders with the tab bar space reserved', async () => {
    await renderWithProviders(<Screen hasTabBar>{child}</Screen>);

    expect(await screen.findByTestId('child')).toBeOnTheScreen();
  });

  describe('the room it keeps for the floating tab bar', () => {
    const BOTTOM_INSET = 34;
    const TAB_BAR_SPACE =
      BOTTOM_INSET + lightTheme.spacing.md + lightTheme.size.fab + lightTheme.spacing.lg;

    it('measures it from the bar, not from a fixed number', async () => {
      await renderWithProviders(<Screen hasTabBar>{child}</Screen>);

      expect((await screen.findByTestId('child')).parent).toHaveStyle({
        paddingBottom: TAB_BAR_SPACE,
      });
    });

    it('reserves the same room when the page scrolls', async () => {
      await renderWithProviders(
        <Screen scroll hasTabBar>
          {child}
        </Screen>,
      );

      const scrollView = (await screen.findByTestId('child')).parent?.parent;

      expect(scrollView).toHaveProp(
        'contentContainerStyle',
        expect.arrayContaining([
          expect.objectContaining({ paddingBottom: TAB_BAR_SPACE }),
        ]) as unknown,
      );
    });
  });

  describe('clamping the overscroll', () => {
    const scrollView = async () => (await screen.findByTestId('child')).parent?.parent;

    it('stops the page rubber-banding past either end when asked', async () => {
      await renderWithProviders(
        <Screen scroll clampsOverscroll>
          {child}
        </Screen>,
      );

      expect(await scrollView()).toHaveProp('bounces', false);
      expect(await scrollView()).toHaveProp('overScrollMode', 'never');
    });

    it('leaves the bounce alone otherwise', async () => {
      await renderWithProviders(<Screen scroll>{child}</Screen>);

      expect(await scrollView()).not.toHaveProp('bounces', false);
      expect(await scrollView()).not.toHaveProp('overScrollMode', 'never');
    });
  });

  describe('a pinned header', () => {
    const TOP_INSET = 47;
    const header = <View testID="header" />;

    it('keeps the header out of the scroll view, so the page scrolls under it', async () => {
      await renderWithProviders(
        <Screen scroll header={header}>
          {child}
        </Screen>,
      );

      const scrollView = (await screen.findByTestId('child')).parent?.parent;

      expect(scrollView).toBeTruthy();
      expect(ancestorsOf(screen.getByTestId('header'))).not.toContain(scrollView);
    });

    it('hands the top inset to the header instead of the content', async () => {
      await renderWithProviders(
        <Screen scroll header={header}>
          {child}
        </Screen>,
      );

      const scrollView = (await screen.findByTestId('child')).parent?.parent;

      expect(screen.getByTestId('header').parent).toHaveStyle({ paddingTop: TOP_INSET });
      expect(scrollView).toHaveProp(
        'contentContainerStyle',
        expect.arrayContaining([expect.objectContaining({ paddingTop: 0 })]) as unknown,
      );
    });

    it('keeps the content its own top inset when there is no header', async () => {
      await renderWithProviders(<Screen scroll>{child}</Screen>);

      const scrollView = (await screen.findByTestId('child')).parent?.parent;

      expect(scrollView).toHaveProp(
        'contentContainerStyle',
        expect.arrayContaining([expect.objectContaining({ paddingTop: TOP_INSET })]) as unknown,
      );
    });
  });

  it('renders while avoiding the keyboard', async () => {
    await renderWithProviders(<Screen avoidsKeyboard>{child}</Screen>);

    expect(await screen.findByTestId('child')).toBeOnTheScreen();
  });

  describe('pan handlers', () => {
    it('puts them on the root so the whole frame is draggable', async () => {
      const { panHandlers } = PanResponder.create(createBackSwipeConfig(jest.fn()));
      await renderWithProviders(
        <Screen scroll panHandlers={panHandlers}>
          {child}
        </Screen>,
      );

      await screen.findByTestId('child');

      const attached = nodesWithResponder();

      expect(attached).toHaveLength(1);
      expect(attached[0]?.['onResponderRelease']).toEqual(expect.any(Function));
    });

    it('leaves the root alone when none are given', async () => {
      await renderWithProviders(<Screen>{child}</Screen>);

      await screen.findByTestId('child');

      expect(nodesWithResponder()).toHaveLength(0);
    });
  });

  describe('a page sheet', () => {
    const TOP_INSET = 47;

    const scrollView = async () => (await screen.findByTestId('child')).parent?.parent;

    it('pads only a small gap on iOS, where the card already clears the status bar', async () => {
      await renderWithProviders(
        <Screen scroll isPageSheet>
          {child}
        </Screen>,
      );

      expect(await scrollView()).toHaveProp(
        'contentContainerStyle',
        expect.arrayContaining([
          expect.objectContaining({ paddingTop: lightTheme.spacing.sm }),
        ]) as unknown,
      );
    });

    it('keeps the status-bar inset on Android, where the route is a full-screen page', async () => {
      const restore = jest.replaceProperty(Platform, 'OS', 'android');

      await renderWithProviders(
        <Screen scroll isPageSheet>
          {child}
        </Screen>,
      );

      expect(await scrollView()).toHaveProp(
        'contentContainerStyle',
        expect.arrayContaining([expect.objectContaining({ paddingTop: TOP_INSET })]) as unknown,
      );
      restore.restore();
    });

    it('refuses a content style that would move the page off its insets', async () => {
      await renderWithProviders(
        // @ts-expect-error -- paddingTop belongs to the frame, not the page.
        <Screen contentStyle={{ paddingTop: 8 }}>{child}</Screen>,
      );

      expect(await screen.findByTestId('child')).toBeOnTheScreen();
    });
  });
});
