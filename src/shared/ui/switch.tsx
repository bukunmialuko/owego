import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  busy?: boolean;
};

export function Switch({ checked, onChange, label, disabled = false, busy = false }: Props) {
  const theme = useTheme();
  const isInert = disabled || busy;
  const { width, height, knob } = theme.size.toggle;
  const inset = (height - knob) / 2;
  const travel = width - knob - inset * 2;

  const [progress] = useState(() => new Animated.Value(checked ? 1 : 0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: checked ? 1 : 0,
      duration: theme.motion.duration.fast,
      easing: theme.motion.easing.standard,
      useNativeDriver: true,
    }).start();
  }, [checked, progress, theme.motion]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled: isInert, busy }}
      disabled={isInert}
      onPress={() => {
        onChange(!checked);
      }}
      style={{
        backgroundColor: checked ? theme.color.fillSuccess : theme.color.fillNeutralPressed,
        borderRadius: theme.radius.pill,
        height,
        opacity: isInert ? theme.opacity.disabled : theme.opacity.full,
        padding: inset,
        width,
      }}
    >
      <Animated.View
        style={[
          styles.knob,
          {
            backgroundColor: theme.color.fillSwitchKnob,
            borderRadius: theme.radius.pill,
            height: knob,
            width: knob,
            transform: [
              {
                translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, travel] }),
              },
            ],
          },
        ]}
      />
      {busy && (
        <ActivityIndicator
          size="small"
          color={theme.color.iconSecondary}
          style={[StyleSheet.absoluteFill, styles.centred]}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  knob: { elevation: 1, shadowOpacity: 0.15, shadowRadius: 2 },
  centred: { alignItems: 'center', justifyContent: 'center' },
});
