import { screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Dimensions } from 'react-native';
import { darkTheme, lightTheme } from '@/core/design-system';
import { renderWithProviders } from '@/test/render-with-providers';
import { Skeleton } from './skeleton';

jest.useFakeTimers();

const HIDDEN = { includeHiddenElements: true } as const;
const skeleton = () => screen.getByTestId('skeleton', HIDDEN);
const shimmer = () => screen.queryByTestId('skeleton-shimmer', HIDDEN);

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Skeleton', () => {
  it('stays out of the screen reader', async () => {
    await renderWithProviders(<Skeleton />);

    expect(screen.queryByTestId('skeleton')).toBeNull();
    expect(skeleton()).toBeOnTheScreen();
  });

  it.each([
    ['light', lightTheme],
    ['dark', darkTheme],
  ] as const)(
    'rests on the skeleton fill in %s mode, at the size asked for',
    async (mode, theme) => {
      await renderWithProviders(<Skeleton width={120} height={20} radius="md" />, { theme: mode });

      expect(skeleton()).toHaveStyle({
        backgroundColor: theme.color.fillSkeleton,
        borderRadius: theme.radius.md,
        height: 20,
        width: 120,
      });
    },
  );

  it('clips the moving highlight to its own corners', async () => {
    await renderWithProviders(<Skeleton />);

    expect(skeleton()).toHaveStyle({ overflow: 'hidden' });
  });

  it('brings the highlight in from beyond its left edge', async () => {
    const { width } = Dimensions.get('window');
    await renderWithProviders(<Skeleton />);

    expect(shimmer()).toHaveStyle({ width, transform: [{ translateX: -width }] });
  });

  it('sweeps the highlight out past its right edge, over and over, off the JS thread', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    const loop = jest.spyOn(Animated, 'loop');
    await renderWithProviders(<Skeleton />);

    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: Dimensions.get('window').width, useNativeDriver: true }),
    );
    expect(loop).toHaveBeenCalledTimes(1);
  });

  it('holds still for someone who has asked for less motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await renderWithProviders(<Skeleton />);

    expect(shimmer()).toBeNull();
    expect(skeleton()).toHaveStyle({ backgroundColor: lightTheme.color.fillSkeleton });
  });
});
