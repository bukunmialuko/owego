import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type GestureResponderHandlers,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/core/design-system/theme-provider';
import { Gradient } from './gradient';
import { PullToRefresh } from './pull-to-refresh';

type FrameInset =
  | 'margin'
  | 'marginEnd'
  | 'marginHorizontal'
  | 'marginLeft'
  | 'marginRight'
  | 'marginStart'
  | 'marginTop'
  | 'marginVertical'
  | 'padding'
  | 'paddingEnd'
  | 'paddingHorizontal'
  | 'paddingLeft'
  | 'paddingRight'
  | 'paddingStart'
  | 'paddingTop'
  | 'paddingVertical';

type ContentStyle = Omit<ViewStyle, FrameInset> & { [K in FrameInset]?: never };

type Props = {
  children: React.ReactNode;
  variant?: 'plain' | 'surface';
  scroll?: boolean;
  hasTabBar?: boolean;
  edgeToEdgeTop?: boolean;
  isPageSheet?: boolean;
  clampsOverscroll?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  avoidsKeyboard?: boolean;
  backdrop?: React.ReactNode;
  contentStyle?: StyleProp<ContentStyle>;
  panHandlers?: GestureResponderHandlers;
};

const FADE_HEIGHT = 64;

export function Screen({
  children,
  variant = 'plain',
  scroll = false,
  hasTabBar = false,
  edgeToEdgeTop = false,
  isPageSheet = false,
  clampsOverscroll = false,
  onRefresh,
  isRefreshing = false,
  header,
  footer,
  avoidsKeyboard = false,
  backdrop,
  contentStyle,
  panHandlers,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const tabBarSpace = insets.bottom + theme.spacing.md + theme.size.fab + theme.spacing.lg;

  const topInset = edgeToEdgeTop
    ? 0
    : isPageSheet && Platform.OS === 'ios'
      ? theme.spacing.sm
      : insets.top;

  const padding: ViewStyle = {
    paddingTop: header === undefined ? topInset : 0,
    paddingBottom: hasTabBar ? tabBarSpace : footer === undefined ? insets.bottom : 0,
  };

  const content = scroll ? (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[padding, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      bounces={!clampsOverscroll}
      overScrollMode={clampsOverscroll ? 'never' : 'auto'}
      refreshControl={
        onRefresh === undefined ? undefined : (
          <PullToRefresh refreshing={isRefreshing} onRefresh={onRefresh} />
        )
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, padding, contentStyle]}>{children}</View>
  );

  const body = (
    <>
      {header !== undefined && <View style={{ paddingTop: topInset }}>{header}</View>}
      {content}
      {footer !== undefined && (
        <View
          style={{
            paddingBottom: insets.bottom + theme.spacing.sm,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.sm,
          }}
        >
          {footer}
        </View>
      )}
    </>
  );

  return (
    <View
      {...panHandlers}
      style={[
        styles.fill,
        { backgroundColor: variant === 'surface' ? theme.color.bgSurface : theme.color.bgCanvas },
      ]}
    >
      {backdrop}

      {avoidsKeyboard ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.fill}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}

      {hasTabBar && (
        <Gradient
          name={variant === 'surface' ? 'bottomFadeSurface' : 'bottomFade'}
          style={[styles.fade, { height: FADE_HEIGHT + insets.bottom }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  fade: { bottom: 0, left: 0, position: 'absolute', right: 0 },
});
