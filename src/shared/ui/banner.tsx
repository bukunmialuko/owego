import { Pressable, StyleSheet } from 'react-native';
import { HStack, VStack } from './stack';
import { Icon } from './icon';
import { Text } from './text';
import type { SurfaceKey } from './box';
import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';
import type { TextColor } from './text';
import type { IconColor } from './icon';

export type BannerTone = 'success' | 'warning' | 'error' | 'info' | 'notice';

type Props = {
  message: string;
  tone?: BannerTone;
  description?: string;
  icon?: IoniconsIconName;
  dismissLabel?: string;
  onDismiss?: () => void;
  action?: { label: string; onPress: () => void };
};

const TONE: Record<
  BannerTone,
  { background: SurfaceKey; text: TextColor; icon: IconColor; glyph: IoniconsIconName }
> = {
  success: {
    background: 'successSubtle',
    text: 'success',
    icon: 'success',
    glyph: 'checkmark-circle',
  },
  warning: { background: 'warningSubtle', text: 'warning', icon: 'warning', glyph: 'alert-circle' },
  error: { background: 'errorSubtle', text: 'error', icon: 'error', glyph: 'close-circle' },
  info: { background: 'brandSubtle', text: 'brand', icon: 'brand', glyph: 'information-circle' },
  notice: {
    background: 'noticeSubtle',
    text: 'notice',
    icon: 'notice',
    glyph: 'information-circle',
  },
};

export function Banner({
  message,
  tone = 'info',
  description,
  icon: glyphOverride,
  dismissLabel,
  onDismiss,
  action,
}: Props) {
  const { background, text, icon, glyph } = TONE[tone];

  return (
    <HStack
      accessible
      accessibilityRole="alert"
      background={background}
      paddingX="lg"
      paddingY="md"
      gap="md"
      align="center"
    >
      <Icon name={glyphOverride ?? glyph} size="md" color={icon} />
      <VStack style={{ flex: 1 }} gap="xxs">
        <Text variant="body.sMedium" color={text}>
          {message}
        </Text>
        {description !== undefined && (
          <Text variant="caption.m" color={text}>
            {description}
          </Text>
        )}
        {action !== undefined && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={action.onPress}
          >
            <Text variant="body.sMedium" color={text} style={styles.action}>
              {action.label}
            </Text>
          </Pressable>
        )}
      </VStack>
      {onDismiss !== undefined && dismissLabel !== undefined && (
        <Pressable accessibilityRole="button" accessibilityLabel={dismissLabel} onPress={onDismiss}>
          <Icon name="close-circle" size="md" color={icon} />
        </Pressable>
      )}
    </HStack>
  );
}

const styles = StyleSheet.create({
  action: { textDecorationLine: 'underline' },
});
