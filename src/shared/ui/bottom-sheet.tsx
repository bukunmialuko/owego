import { createContext, useContext, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/core/design-system/theme-provider';
import { IconButton } from './icon-button';
import { Text } from './text';
import { useKeyboardHeight } from './use-keyboard-height';

const SHEET_SHARE = 0.8;

type SheetBodyFrame = { top: number; room: number };

const SheetBodyFrameContext = createContext<SheetBodyFrame | undefined>(undefined);

export function useSheetBodyFrame(): SheetBodyFrame | undefined {
  return useContext(SheetBodyFrameContext);
}

type Props = {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  closeLabel: string;
  onClose: () => void;
  hasCloseButton?: boolean;
  closeTone?: 'neutral' | 'onTint';
  overlay?: React.ReactNode;
  backdrop?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

export function BottomSheet({
  isOpen,
  title,
  subtitle,
  closeLabel,
  onClose,
  hasCloseButton = false,
  closeTone = 'neutral',
  overlay,
  backdrop,
  footer,
  children,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { height: windowHeight } = useWindowDimensions();

  const hasTitleRow = title !== undefined;
  const hasSubtitle = subtitle !== undefined;
  const bottomPadding = (keyboardHeight > 0 ? keyboardHeight : insets.bottom) + theme.spacing.lg;
  const maxHeight = (windowHeight - keyboardHeight) * SHEET_SHARE + keyboardHeight;

  const [bodyTop, setBodyTop] = useState<number>();
  const [footerHeight, setFooterHeight] = useState<number>();
  const heightBelowBody = footer === undefined ? bottomPadding : footerHeight;
  const bodyFrame = useMemo(
    () =>
      bodyTop === undefined || heightBelowBody === undefined
        ? undefined
        : { top: bodyTop, room: maxHeight - bodyTop - heightBelowBody },
    [bodyTop, heightBelowBody, maxHeight],
  );

  const closeButton = hasCloseButton ? (
    <IconButton icon="close" label={closeLabel} tone={closeTone} onPress={onClose} />
  ) : undefined;

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <View accessibilityViewIsModal style={styles.fill}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          onPress={onClose}
          style={[styles.scrim, { backgroundColor: theme.color.bgScrim }]}
        />

        <View
          style={[
            theme.elevation.sheet,
            {
              backgroundColor: theme.color.bgSurfaceOverlay,
              borderTopLeftRadius: theme.radius.sheet,
              borderTopRightRadius: theme.radius.sheet,
              maxHeight,
              paddingBottom: bottomPadding,
              paddingHorizontal: theme.spacing.lg,
              paddingTop: theme.spacing.xl,
            },
          ]}
        >
          {backdrop !== undefined && (
            <View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[
                StyleSheet.absoluteFill,
                {
                  borderTopLeftRadius: theme.radius.sheet,
                  borderTopRightRadius: theme.radius.sheet,
                  overflow: 'hidden',
                },
              ]}
            >
              {backdrop}
            </View>
          )}

          {hasTitleRow && (
            <>
              <View
                style={[
                  styles.header,
                  { marginBottom: hasSubtitle ? theme.spacing.xs : theme.spacing.lg },
                ]}
              >
                {hasCloseButton && <View style={{ width: theme.size.control.md }} />}

                <Text variant="heading.h5" align="center" style={styles.title}>
                  {title}
                </Text>

                {closeButton}
              </View>

              {subtitle !== undefined && (
                <Text
                  variant="body.m"
                  color="secondary"
                  align="center"
                  style={{ marginBottom: theme.spacing.lg }}
                >
                  {subtitle}
                </Text>
              )}
            </>
          )}

          <View
            style={styles.body}
            onLayout={(event) => {
              setBodyTop(event.nativeEvent.layout.y);
            }}
          >
            {!hasTitleRow && closeButton !== undefined && (
              <View style={styles.floatingClose}>{closeButton}</View>
            )}

            <ScrollView
              contentContainerStyle={{ gap: theme.spacing.xs }}
              keyboardShouldPersistTaps="handled"
            >
              <SheetBodyFrameContext.Provider value={bodyFrame}>
                {children}
              </SheetBodyFrameContext.Provider>
            </ScrollView>
          </View>

          {footer !== undefined && (
            <View
              onLayout={(event) => {
                setFooterHeight(event.nativeEvent.layout.height);
              }}
              style={{
                backgroundColor:
                  backdrop === undefined ? theme.color.bgSurfaceOverlay : theme.color.bgSurface,
                marginBottom: -bottomPadding,
                marginHorizontal: -theme.spacing.lg,
                paddingBottom: bottomPadding,
                paddingHorizontal: theme.spacing.lg,
              }}
            >
              {footer}
            </View>
          )}
        </View>

        {overlay}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  scrim: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  header: { alignItems: 'center', flexDirection: 'row' },
  title: { flex: 1 },
  body: { flexShrink: 1 },
  floatingClose: { position: 'absolute', right: 0, top: 0, zIndex: 1 },
});
