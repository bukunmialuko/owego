import { useEffect, useState, type ComponentType } from 'react';
import { Animated, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SvgProps } from 'react-native-svg';
import OwegoSymbol from '@/assets/icons/owego-symbol.svg';
import { ThemeScope, useTheme } from '@/core/design-system/theme-provider';
import { useIconColor } from './icon';
import { Fab } from './fab';
import { squeeze } from './press-motion';
import { useReducedMotion } from './use-reduced-motion';

export type TabId = 'home' | 'wealth' | 'travel';

export type TabItem = {
  id: TabId;
  label: string;
  icon: { active: ComponentType<SvgProps>; inactive: ComponentType<SvgProps> };
};

type Props = {
  items: TabItem[];
  activeId: TabId;
  onSelect: (id: TabId) => void;
  fabLabel: string;
  onPressFab: () => void;
  isFabActive?: boolean;
};

const DOT_SIZE = 5;
const MAX_BAR_WIDTH = 420;
const POP_SCALE = 1.12;
const PRESS_SCALE = 0.9;

export function TabBar({
  items,
  activeId,
  onSelect,
  fabLabel,
  onPressFab,
  isFabActive = false,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          bottom: insets.bottom + theme.spacing.md,
          left: theme.spacing.lg,
          right: theme.spacing.lg,
          zIndex: theme.zIndex.sticky,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.bar, { maxWidth: MAX_BAR_WIDTH }]} pointerEvents="box-none">
        <ThemeScope mode="light">
          <TabPill items={items} activeId={activeId} onSelect={onSelect} />
        </ThemeScope>

        <Fab label={fabLabel} mark={OwegoSymbol} isActive={isFabActive} onPress={onPressFab} />
      </View>
    </View>
  );
}

function TabPill({ items, activeId, onSelect }: Pick<Props, 'items' | 'activeId' | 'onSelect'>) {
  const theme = useTheme();
  const isReduced = useReducedMotion();
  const [rowWidth, setRowWidth] = useState(0);

  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.id === activeId),
  );
  const tabWidth = items.length === 0 ? 0 : rowWidth / items.length;

  return (
    <View
      style={[
        theme.elevation.floating,
        {
          backgroundColor: theme.color.bgSurfaceRaised,
          borderRadius: theme.radius.pill,
          height: theme.size.fab,
        },
      ]}
    >
      <View
        accessibilityRole="tablist"
        onLayout={(event: LayoutChangeEvent) => {
          setRowWidth(event.nativeEvent.layout.width);
        }}
        style={styles.tabs}
      >
        {rowWidth > 0 && (
          <Indicator index={activeIndex} tabWidth={tabWidth} isReduced={isReduced} />
        )}

        {items.map((item) => (
          <TabGlyph
            key={item.id}
            item={item}
            isActive={item.id === activeId}
            isReduced={isReduced}
            onPress={() => {
              onSelect(item.id);
            }}
          />
        ))}
      </View>
    </View>
  );
}

function Indicator({
  index,
  tabWidth,
  isReduced,
}: {
  index: number;
  tabWidth: number;
  isReduced: boolean;
}) {
  const theme = useTheme();
  const [slide] = useState(() => new Animated.Value(index));

  useEffect(() => {
    if (isReduced) {
      slide.setValue(index);

      return;
    }

    const animation = Animated.timing(slide, {
      toValue: index,
      duration: theme.motion.duration.normal,
      easing: theme.motion.easing.standard,
      useNativeDriver: true,
    });

    animation.start();

    return () => {
      animation.stop();
    };
  }, [index, isReduced, slide, theme.motion]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        styles.dot,
        {
          backgroundColor: theme.color.fillBrand,
          borderRadius: theme.radius.pill,
          height: DOT_SIZE,
          width: DOT_SIZE,
          left: tabWidth / 2 - DOT_SIZE / 2,
          top: theme.spacing.sm - 2,
          transform: [{ translateX: Animated.multiply(slide, tabWidth) }],
        },
      ]}
    />
  );
}

function TabGlyph({
  item,
  isActive,
  isReduced,
  onPress,
}: {
  item: TabItem;
  isActive: boolean;
  isReduced: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const activeColor = useIconColor('primary');
  const inactiveColor = useIconColor('secondary');

  const [select] = useState(() => new Animated.Value(isActive ? 1 : 0));
  const [press] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (isReduced) {
      select.setValue(isActive ? 1 : 0);

      return;
    }

    const animation = Animated.timing(select, {
      toValue: isActive ? 1 : 0,
      duration: theme.motion.duration.fast,
      easing: theme.motion.easing.standard,
      useNativeDriver: true,
    });

    animation.start();

    return () => {
      animation.stop();
    };
  }, [isActive, isReduced, select, theme.motion]);

  const size = theme.size.icon.md;
  const ActiveGlyph = item.icon.active;
  const InactiveGlyph = item.icon.inactive;

  const scale = Animated.multiply(
    select.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, POP_SCALE, 1] }),
    press.interpolate({ inputRange: [0, 1], outputRange: [1, PRESS_SCALE] }),
  );

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      onPressIn={() => {
        squeeze(press, true, theme.motion, isReduced);
      }}
      onPressOut={() => {
        squeeze(press, false, theme.motion, isReduced);
      }}
      style={[styles.tab, { paddingHorizontal: theme.spacing.xl }]}
    >
      <Animated.View style={{ height: size, width: size, transform: [{ scale }] }}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { opacity: select.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
          ]}
        >
          <InactiveGlyph width={size} height={size} color={inactiveColor} />
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, { opacity: select }]}>
          <ActiveGlyph width={size} height={size} color={activeColor} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', position: 'absolute' },
  bar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  tabs: { alignItems: 'stretch', flex: 1, flexDirection: 'row' },
  tab: { alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute' },
});
