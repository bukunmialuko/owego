import { useEffect, useState } from 'react';
import { Animated } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import { Icon } from './icon';
import { useReducedMotion } from './use-reduced-motion';

export function DisclosureChevron({ isExpanded }: { isExpanded: boolean }) {
  const theme = useTheme();
  const isReduced = useReducedMotion();
  const [turn] = useState(() => new Animated.Value(isExpanded ? 1 : 0));

  useEffect(() => {
    if (isReduced) {
      turn.setValue(isExpanded ? 1 : 0);

      return;
    }

    const animation = Animated.timing(turn, {
      toValue: isExpanded ? 1 : 0,
      duration: theme.motion.duration.normal,
      easing: theme.motion.easing.standard,
      useNativeDriver: true,
    });

    animation.start();

    return () => {
      animation.stop();
    };
  }, [isExpanded, isReduced, theme.motion, turn]);

  return (
    <Animated.View
      testID="disclosure-chevron"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        transform: [
          { rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) },
        ],
      }}
    >
      <Icon name="chevron-forward" size="sm" color="secondary" />
    </Animated.View>
  );
}
