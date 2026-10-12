import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '@/core/design-system/theme-provider';
import type { GradientToken, Theme } from '@/core/design-system';

type Props = {
  name: keyof Theme['gradient'];
  radius?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export function Gradient({ name, radius = 0, style, children }: Props) {
  const theme = useTheme();
  const gradient = theme.gradient[name];

  return (
    <View
      style={[radius > 0 && { borderRadius: radius, overflow: 'hidden' }, style]}
      pointerEvents="box-none"
    >
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient
            id={name}
            x1={gradient.start.x}
            y1={gradient.start.y}
            x2={gradient.end.x}
            y2={gradient.end.y}
          >
            {stopsOf(gradient)}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${name})`} />
      </Svg>
      {children}
    </View>
  );
}

function stopsOf(gradient: GradientToken) {
  return gradient.colors.map((color, index) => {
    const alpha = /rgba\([^)]*,\s*([\d.]+)\s*\)/.exec(color)?.[1];

    return (
      <Stop
        key={`${color}-${String(index)}`}
        offset={gradient.locations[index] ?? index / (gradient.colors.length - 1)}
        stopColor={
          alpha === undefined
            ? color
            : color.replace(/,\s*[\d.]+\s*\)$/, ')').replace('rgba(', 'rgb(')
        }
        stopOpacity={alpha ?? 1}
      />
    );
  });
}
