import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/core/design-system/theme-provider';
import type { Theme } from '@/core/design-system';
import { Text } from './text';
import type { ProgressTone } from './progress-bar';

type Props = {
  value: number;
  tone?: ProgressTone;
  size?: number;
  accessibilityLabel: string;
};

const TONE: Record<ProgressTone, keyof Theme['color']> = {
  success: 'fillSuccess',
  error: 'fillError',
  brand: 'fillBrandStrong',
};

const STROKE = 3;

export function ProgressRing({ value, tone = 'brand', size, accessibilityLabel }: Props) {
  const theme = useTheme();
  const diameter = size ?? theme.size.avatar.md;
  const clamped = Math.min(Math.max(value, 0), 1);
  const percent = Math.round(clamped * 100);

  const radius = (diameter - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={[styles.container, { height: diameter, width: diameter }]}
    >
      <Svg width={diameter} height={diameter} style={StyleSheet.absoluteFill}>
        <Circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          stroke={theme.color.fillNeutral}
          strokeWidth={STROKE}
          fill="none"
        />
        <Circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          stroke={theme.color[TONE[tone]]}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          fill="none"
          transform={`rotate(-90 ${String(diameter / 2)} ${String(diameter / 2)})`}
        />
      </Svg>

      <Text variant="caption.mMedium">{`${String(percent)}%`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});
