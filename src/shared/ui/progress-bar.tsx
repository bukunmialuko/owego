import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';
import { useTheme } from '@/core/design-system/theme-provider';
import type { Theme } from '@/core/design-system';

export type ProgressTone = 'success' | 'error' | 'brand';

type Props = {
  value: number;
  tone?: ProgressTone;
  height?: number;
  accessibilityLabel: string;
};

const TONE: Record<ProgressTone, { fill: keyof Theme['color']; track: keyof Theme['color'] }> = {
  success: { fill: 'fillSuccess', track: 'textSuccess' },
  error: { fill: 'fillError', track: 'textError' },
  brand: { fill: 'fillBrandStrong', track: 'textBrand' },
};

const HATCH_SIZE = 8;
const HATCH_WIDTH = 2;

const HATCH_OPACITY = 0.35;

export function ProgressBar({ value, tone = 'brand', height, accessibilityLabel }: Props) {
  const theme = useTheme();
  const { fill, track } = TONE[tone];
  const clamped = Math.min(Math.max(value, 0), 1);
  const percent = Math.round(clamped * 100);
  const barHeight = height ?? theme.spacing.lg;
  const patternId = `hatch-${tone}`;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={[styles.container, { borderRadius: theme.radius.sm, height: barHeight }]}
    >
      <Svg width="100%" height={barHeight}>
        <Defs>
          <Pattern
            id={patternId}
            width={HATCH_SIZE}
            height={HATCH_SIZE}
            patternUnits="userSpaceOnUse"
          >
            {[
              { x1: -HATCH_SIZE / 4, y1: HATCH_SIZE / 4, x2: HATCH_SIZE / 4, y2: -HATCH_SIZE / 4 },
              { x1: 0, y1: HATCH_SIZE, x2: HATCH_SIZE, y2: 0 },
              {
                x1: (HATCH_SIZE * 3) / 4,
                y1: (HATCH_SIZE * 5) / 4,
                x2: (HATCH_SIZE * 5) / 4,
                y2: (HATCH_SIZE * 3) / 4,
              },
            ].map((line) => (
              <Line
                key={`${String(line.x1)}-${String(line.y1)}`}
                {...line}
                stroke={theme.color[track]}
                strokeWidth={HATCH_WIDTH}
              />
            ))}
          </Pattern>
        </Defs>

        <Rect
          x="0"
          y="0"
          width="100%"
          height={barHeight}
          fill={`url(#${patternId})`}
          opacity={HATCH_OPACITY}
        />
        <Rect
          x="0"
          y="0"
          width={`${String(percent)}%`}
          height={barHeight}
          fill={theme.color[fill]}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', width: '100%' },
});
