import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import type { Theme } from '@/core/design-system';

export type SpacingKey = keyof Theme['spacing'];
export type RadiusKey = keyof Theme['radius'];
type ElevationKey = keyof Theme['elevation'];

export type SurfaceKey =
  | 'canvas'
  | 'surface'
  | 'surfaceRaised'
  | 'surfaceOverlay'
  | 'surfaceSunken'
  | 'inverse'
  | 'brand'
  | 'brandSubtle'
  | 'accent'
  | 'neutral'
  | 'successSubtle'
  | 'warningSubtle'
  | 'errorSubtle'
  | 'noticeSubtle';

export type BorderKey = 'subtle' | 'default' | 'strong' | 'brand' | 'error' | 'success';

export type BoxProps = ViewProps & {
  padding?: SpacingKey;
  paddingX?: SpacingKey;
  paddingY?: SpacingKey;
  paddingTop?: SpacingKey;
  paddingBottom?: SpacingKey;
  gap?: SpacingKey;
  background?: SurfaceKey;
  radius?: RadiusKey;
  border?: BorderKey;
  elevation?: ElevationKey;
  style?: StyleProp<ViewStyle>;
};

export function Box({
  padding,
  paddingX,
  paddingY,
  paddingTop,
  paddingBottom,
  gap,
  background,
  radius,
  border,
  elevation,
  style,
  children,
  ...rest
}: BoxProps) {
  const theme = useTheme();

  return (
    <View
      {...rest}
      style={[
        boxStyle(theme, {
          padding,
          paddingX,
          paddingY,
          paddingTop,
          paddingBottom,
          gap,
          background,
          radius,
          border,
          elevation,
        }),
        style,
      ]}
    >
      {children}
    </View>
  );
}

type StyleInput = {
  [
    K in
      | 'padding'
      | 'paddingX'
      | 'paddingY'
      | 'paddingTop'
      | 'paddingBottom'
      | 'gap'
      | 'background'
      | 'radius'
      | 'border'
      | 'elevation'
  ]: BoxProps[K] | undefined;
};

export function boxStyle(theme: Theme, props: StyleInput): ViewStyle {
  const { spacing } = theme;

  return {
    ...(props.padding !== undefined && { padding: spacing[props.padding] }),
    ...(props.paddingX !== undefined && { paddingHorizontal: spacing[props.paddingX] }),
    ...(props.paddingY !== undefined && { paddingVertical: spacing[props.paddingY] }),
    ...(props.paddingTop !== undefined && { paddingTop: spacing[props.paddingTop] }),
    ...(props.paddingBottom !== undefined && { paddingBottom: spacing[props.paddingBottom] }),
    ...(props.gap !== undefined && { gap: spacing[props.gap] }),
    ...(props.background !== undefined && {
      backgroundColor: theme.color[SURFACE_TOKEN[props.background]],
    }),
    ...(props.radius !== undefined && { borderRadius: theme.radius[props.radius] }),
    ...(props.border !== undefined && {
      borderColor: theme.color[BORDER_TOKEN[props.border]],
      borderWidth: theme.borderWidth.thin,
    }),
    ...(props.elevation !== undefined && theme.elevation[props.elevation]),
  };
}

const SURFACE_TOKEN = {
  canvas: 'bgCanvas',
  surface: 'bgSurface',
  surfaceRaised: 'bgSurfaceRaised',
  surfaceOverlay: 'bgSurfaceOverlay',
  surfaceSunken: 'bgSurfaceSunken',
  inverse: 'bgInverse',
  brand: 'fillBrand',
  brandSubtle: 'fillBrandSubtle',
  accent: 'fillAccent',
  neutral: 'fillNeutral',
  successSubtle: 'fillSuccessSubtle',
  warningSubtle: 'fillWarningSubtle',
  errorSubtle: 'fillErrorSubtle',
  noticeSubtle: 'fillNoticeSubtle',
} as const satisfies Record<SurfaceKey, string>;

const BORDER_TOKEN = {
  subtle: 'borderSubtle',
  default: 'borderDefault',
  strong: 'borderStrong',
  brand: 'borderBrand',
  error: 'borderError',
  success: 'borderSuccess',
} as const satisfies Record<BorderKey, string>;
