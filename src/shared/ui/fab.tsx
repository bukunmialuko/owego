import { useEffect, useState, type ComponentProps, type ComponentType } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import { useTheme } from '@/core/design-system/theme-provider';
import { Icon } from './icon';
import { squeeze } from './press-motion';
import { useReducedMotion } from './use-reduced-motion';

const PRESS_SCALE = 0.92;

type Face =
  | { icon: ComponentProps<typeof Icon>['name']; mark?: never }
  | { mark: ComponentType<SvgProps>; icon?: never };

type Props = Face & {
  label: string;
  onPress: () => void;
  isActive?: boolean;
};

export function Fab({ label, icon, mark: Mark, onPress, isActive = false }: Props) {
  const theme = useTheme();
  const isReduced = useReducedMotion();
  const [press] = useState(() => new Animated.Value(0));
  const [turn] = useState(() => new Animated.Value(isActive ? 1 : 0));

  useEffect(() => {
    if (isReduced) {
      turn.setValue(isActive ? 1 : 0);

      return;
    }

    const animation = Animated.timing(turn, {
      toValue: isActive ? 1 : 0,
      duration: theme.motion.duration.normal,
      easing: theme.motion.easing.standard,
      useNativeDriver: true,
    });

    animation.start();

    return () => {
      animation.stop();
    };
  }, [isActive, isReduced, theme.motion, turn]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => {
        squeeze(press, true, theme.motion, isReduced);
      }}
      onPressOut={() => {
        squeeze(press, false, theme.motion, isReduced);
      }}
      style={[
        styles.fab,
        theme.elevation.floating,
        {
          backgroundColor:
            Mark === undefined ? theme.color.fillActionElevated : theme.color.bgSurfaceRaised,
          borderRadius: theme.radius.pill,
          height: theme.size.fab,
          width: theme.size.fab,
        },
      ]}
    >
      <Animated.View
        style={{
          transform: [
            { scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, PRESS_SCALE] }) },
            { rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) },
          ],
        }}
      >
        {Mark === undefined ? (
          icon !== undefined && <Icon name={icon} size="lg" color="onActionElevated" />
        ) : (
          <Mark testID="fab-mark" width={theme.size.icon.lg} height={theme.size.icon.lg} />
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: { alignItems: 'center', justifyContent: 'center' },
});
