import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse } from 'react-native-svg';
import { useTheme } from '@/core/design-system/theme-provider';
import type { AvatarSize } from './avatar';

type Props = {
  size?: AvatarSize;
  diameter?: number;
};

export function AvatarSilhouette({ size = 'md', diameter: exact }: Props) {
  const theme = useTheme();
  const diameter = exact ?? theme.size.avatar[size];
  const figure = theme.color.fillAvatarSilhouetteFigure;

  return (
    <View
      testID="avatar-silhouette"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.disc,
        {
          backgroundColor: theme.color.fillAvatarSilhouette,
          width: diameter,
          height: diameter,
          borderRadius: theme.radius.pill,
        },
      ]}
    >
      <Svg width={diameter} height={diameter} viewBox="0 0 100 100">
        <Circle cx={50} cy={43.5} r={17.6} fill={figure} />
        <Ellipse
          testID="avatar-silhouette-shoulders"
          cx={50}
          cy={90.5}
          rx={38.5}
          ry={23.5}
          fill={figure}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { overflow: 'hidden' },
});
