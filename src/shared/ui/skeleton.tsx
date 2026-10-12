import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, useWindowDimensions, type DimensionValue } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import type { Theme } from '@/core/design-system';
import { Gradient } from './gradient';
import { useReducedMotion } from './use-reduced-motion';

type Props = {
  width?: DimensionValue;
  height?: number;
  radius?: keyof Theme['radius'];
};

export function Skeleton({ width = '100%', height = 16, radius = 'sm' }: Props) {
  const theme = useTheme();
  const isMotionReduced = useReducedMotion();

  return (
    <View
      testID="skeleton"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        backgroundColor: theme.color.fillSkeleton,
        borderRadius: theme.radius[radius],
        height,
        overflow: 'hidden',
        width,
      }}
    >
      {!isMotionReduced && <Shimmer />}
    </View>
  );
}

function Shimmer() {
  const { motion } = useTheme();
  const { width: travel } = useWindowDimensions();
  const [offset] = useState(() => new Animated.Value(-travel));

  useEffect(() => {
    offset.setValue(-travel);

    const sweep = Animated.loop(
      Animated.timing(offset, {
        toValue: travel,
        duration: motion.duration.ambient,
        easing: motion.easing.ambient,
        useNativeDriver: true,
      }),
    );

    sweep.start();

    return () => {
      sweep.stop();
    };
  }, [offset, travel, motion]);

  return (
    <Animated.View
      testID="skeleton-shimmer"
      style={[styles.band, { width: travel, transform: [{ translateX: offset }] }]}
    >
      <Gradient name="skeletonShimmer" style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  band: { bottom: 0, left: 0, position: 'absolute', top: 0 },
});
