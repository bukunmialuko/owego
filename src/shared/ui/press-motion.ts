import { Animated } from 'react-native';
import type { Motion } from '@/core/design-system';

export function squeeze(
  value: Animated.Value,
  isDown: boolean,
  motion: Motion,
  isReduced: boolean,
) {
  if (isReduced) {
    value.setValue(isDown ? 1 : 0);

    return;
  }

  const animation = isDown
    ? Animated.timing(value, {
        toValue: 1,
        duration: motion.duration.instant,
        easing: motion.easing.standard,
        useNativeDriver: true,
      })
    : Animated.spring(value, { toValue: 0, ...motion.spring.snappy, useNativeDriver: true });

  animation.start();
}
