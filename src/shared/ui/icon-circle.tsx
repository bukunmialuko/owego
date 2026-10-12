import type { ComponentType } from 'react';
import type { SvgProps } from 'react-native-svg';
import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/core/design-system/theme-provider';
import type { Theme } from '@/core/design-system';
import { Box, type SurfaceKey } from './box';
import { Icon, useIconColor, type IconColor } from './icon';

export type IconCircleTone = 'brand' | 'success' | 'error' | 'warning' | 'neutral' | 'accent';

type Props = {
  tone?: IconCircleTone;
  size?: keyof Theme['size']['avatar'];
  glyph?: ComponentType<SvgProps> | undefined;
  icon?: IoniconsIconName | undefined;
};

const TONE: Record<IconCircleTone, { background: SurfaceKey; foreground: IconColor }> = {
  brand: { background: 'brandSubtle', foreground: 'brand' },
  success: { background: 'successSubtle', foreground: 'success' },
  error: { background: 'errorSubtle', foreground: 'error' },
  warning: { background: 'warningSubtle', foreground: 'warning' },
  neutral: { background: 'surfaceSunken', foreground: 'secondary' },
  accent: { background: 'accent', foreground: 'onAccent' },
};

export function IconCircle({ tone = 'neutral', size = 'lg', glyph: Glyph, icon }: Props) {
  const theme = useTheme();
  const { background, foreground } = TONE[tone];
  const diameter = theme.size.avatar[size];
  const color = useIconColor(foreground);

  return (
    <Box
      accessibilityElementsHidden
      importantForAccessibility="no"
      background={background}
      radius="pill"
      style={{
        alignItems: 'center',
        height: diameter,
        justifyContent: 'center',
        overflow: 'hidden',
        width: diameter,
      }}
    >
      {Glyph === undefined ? (
        icon !== undefined && <Icon name={icon} size="md" color={foreground} />
      ) : (
        <Glyph width={diameter} height={diameter} color={color} />
      )}
    </Box>
  );
}
