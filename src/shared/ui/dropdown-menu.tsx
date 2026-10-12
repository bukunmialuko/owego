import { Modal, Pressable, StyleSheet, View, type LayoutRectangle } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import { Icon } from './icon';
import { Text } from './text';

export type DropdownOption = {
  id: string;
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  disabled?: boolean;
};

type Props = {
  isOpen: boolean;
  anchor: LayoutRectangle | undefined;
  options: DropdownOption[];
  emptyMessage?: string;
  selectedId?: string;
  closeLabel: string;
  onSelect: (id: string) => void;
  onClose: () => void;
};

const EDGE_MARGIN = 16;
const MIN_WIDTH = 240;

export function DropdownMenu({
  isOpen,
  anchor,
  options,
  emptyMessage,
  selectedId,
  closeLabel,
  onSelect,
  onClose,
}: Props) {
  const theme = useTheme();

  if (anchor === undefined) return null;

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View accessibilityViewIsModal style={styles.fill}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          onPress={onClose}
          style={styles.fill}
        />

        <View
          testID="dropdown-menu-panel"
          style={[
            styles.panel,
            theme.elevation.raised,
            {
              backgroundColor: theme.color.bgSurfaceOverlay,
              borderRadius: theme.radius.lg,
              left: Math.max(anchor.x, EDGE_MARGIN),
              minWidth: Math.max(anchor.width, MIN_WIDTH),
              padding: theme.spacing.xs,
              top: anchor.y + anchor.height + theme.spacing.xs,
            },
          ]}
        >
          {options.length === 0 && emptyMessage !== undefined && (
            <View style={{ padding: theme.spacing.md }}>
              <Text variant="body.m" color="secondary">
                {emptyMessage}
              </Text>
            </View>
          )}

          {options.map((option) => {
            const isSelected = option.id === selectedId;

            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityLabel={[option.title, option.subtitle].filter(Boolean).join(', ')}
                accessibilityState={{ disabled: option.disabled ?? false, selected: isSelected }}
                disabled={option.disabled ?? false}
                onPress={() => {
                  onSelect(option.id);
                }}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: isSelected
                      ? theme.color.bgSurfaceSunken
                      : pressed
                        ? theme.color.fillNeutral
                        : 'transparent',
                    borderRadius: theme.radius.md,
                    gap: theme.spacing.md,
                    padding: theme.spacing.md,
                  },
                ]}
              >
                {option.leading}

                <View style={styles.body}>
                  <Text
                    variant="body.mEmphasis"
                    color={option.disabled === true ? 'disabled' : 'primary'}
                    numberOfLines={1}
                  >
                    {option.title}
                  </Text>
                  {option.subtitle !== undefined && (
                    <Text variant="body.s" color="tertiary" numberOfLines={1}>
                      {option.subtitle}
                    </Text>
                  )}
                </View>

                {isSelected && <Icon name="checkmark" size="sm" color="success" />}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  panel: { position: 'absolute' },
  row: { alignItems: 'center', flexDirection: 'row' },
  body: { flex: 1 },
});
