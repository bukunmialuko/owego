import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useTheme } from '@/core/design-system/theme-provider';
import type { Theme } from '@/core/design-system';
import { flagFor, flagSvgFor } from './flag';
import { Text } from './text';

type Props = {
  code: string;
  size?: keyof Theme['size']['avatar'];
  diameter?: number;
};

export function CountryFlag({ code, size = 'md', diameter: exact }: Props) {
  const theme = useTheme();
  const diameter = exact ?? theme.size.avatar[size];
  const artwork = flagSvgFor(code);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        styles.circle,
        {
          backgroundColor: theme.color.bgSurfaceSunken,
          borderRadius: theme.radius.pill,
          height: diameter,
          width: diameter,
        },
      ]}
    >
      {artwork === undefined ? (
        <Text variant="body.m">{flagFor(code)}</Text>
      ) : (
        <SvgXml xml={artwork} width={diameter} height={diameter} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
