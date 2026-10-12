import { HStack } from './stack';
import { Icon, type IconColor } from './icon';
import { Text, type TextColor } from './text';
import type { SurfaceKey } from './box';
import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'error' | 'accent';

export type BadgeSize = 'sm' | 'md';

type Props = {
  label: string;
  tone?: BadgeTone;
  size?: BadgeSize;
  icon?: IoniconsIconName;
};

const TONE: Record<BadgeTone, { background: SurfaceKey; text: TextColor; icon: IconColor }> = {
  neutral: { background: 'neutral', text: 'secondary', icon: 'secondary' },
  brand: { background: 'brandSubtle', text: 'brand', icon: 'brand' },
  success: { background: 'successSubtle', text: 'success', icon: 'success' },
  warning: { background: 'warningSubtle', text: 'warning', icon: 'warning' },
  error: { background: 'errorSubtle', text: 'error', icon: 'error' },
  accent: { background: 'accent', text: 'onAccent', icon: 'onAccent' },
};

export function Badge({ label, tone = 'neutral', size = 'sm', icon }: Props) {
  const { background, text, icon: iconColor } = TONE[tone];
  const isLarge = size === 'md';

  return (
    <HStack
      background={background}
      radius="pill"
      paddingX={isLarge ? 'lg' : 'sm'}
      paddingY={isLarge ? 'sm' : 'xs'}
      gap="xs"
    >
      {icon !== undefined && <Icon name={icon} size={isLarge ? 'sm' : 'xs'} color={iconColor} />}
      <Text variant={isLarge ? 'body.mEmphasis' : 'label.s'} color={text}>
        {label}
      </Text>
    </HStack>
  );
}
