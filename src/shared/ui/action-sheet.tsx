import type { ComponentType } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SvgProps } from 'react-native-svg';
import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/core/design-system/theme-provider';
import type { Theme } from '@/core/design-system';
import { Icon } from './icon';
import { IconCircle, type IconCircleTone } from './icon-circle';
import { HStack, VStack } from './stack';
import { Text } from './text';

export type ActionSheetItem = {
  id: string;
  title: string;
  description: string;
  icon?: IoniconsIconName;
  glyph?: ComponentType<SvgProps>;
  tone: IconCircleTone;
  disabled?: boolean;
};

type Props = {
  isOpen: boolean;
  items: ActionSheetItem[];
  closeLabel: string;
  onClose: () => void;
  onSelect: (id: string) => void;
};

export function ActionSheet({ isOpen, items, closeLabel, onClose, onSelect }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View accessibilityViewIsModal style={styles.fill}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          onPress={onClose}
          style={[
            styles.fill,
            { backgroundColor: theme.color.bgScrim, opacity: theme.opacity.pressed },
          ]}
        />

        <View
          pointerEvents="box-none"
          style={[
            styles.foreground,
            { bottom: insets.bottom + theme.spacing.md, paddingHorizontal: theme.spacing.lg },
          ]}
        >
          <VStack
            testID="quick-actions-panel"
            background="canvas"
            radius="xl"
            padding="sm"
            style={[styles.panel, theme.elevation.floating]}
          >
            {items.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${item.description}`}
                accessibilityState={{ disabled: item.disabled ?? false }}
                disabled={item.disabled ?? false}
                onPress={() => {
                  onSelect(item.id);
                }}
                style={({ pressed }) => ({
                  opacity: opacityFor(pressed, item.disabled ?? false, theme.opacity),
                })}
              >
                <HStack paddingX="sm" paddingY="md" gap="md">
                  <IconCircle tone={item.tone} icon={item.icon} glyph={item.glyph} />
                  <VStack style={styles.copy} gap="xxs">
                    <Text variant="body.mEmphasis">{item.title}</Text>
                    <Text variant="body.s" color="tertiary">
                      {item.description}
                    </Text>
                  </VStack>
                </HStack>
              </Pressable>
            ))}
          </VStack>

          <Pressable
            testID="quick-actions-close"
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            onPress={onClose}
            style={[
              styles.fab,
              theme.elevation.floating,
              {
                backgroundColor: theme.color.fillOnTint,
                borderRadius: theme.radius.pill,
                height: theme.size.fab,
                marginTop: theme.spacing.lg,
                width: theme.size.fab,
              },
            ]}
          >
            <Icon name="close" size="lg" color="primary" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function opacityFor(pressed: boolean, disabled: boolean, opacity: Theme['opacity']) {
  if (disabled) return opacity.disabled;

  return pressed ? opacity.pressed : opacity.full;
}

const styles = StyleSheet.create({
  fill: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  foreground: { alignItems: 'flex-end', left: 0, position: 'absolute', right: 0 },
  panel: { alignSelf: 'stretch' },
  copy: { flex: 1 },
  fab: { alignItems: 'center', justifyContent: 'center' },
});
