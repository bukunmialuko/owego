import Ionicons, { type IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/core/design-system/theme-provider';
import type { Theme } from '@/core/design-system';

export type IconColor =
  | 'primary'
  | 'secondary'
  | 'disabled'
  | 'brand'
  | 'onBrand'
  | 'onAccent'
  | 'inverse'
  | 'onVendorDark'
  | 'onActionElevated'
  | 'onBrandFaint'
  | 'onNeutralSubtle'
  | 'success'
  | 'warning'
  | 'error'
  | 'notice'
  | 'warningOnInverse'
  | 'benefit';

type Props = {
  name: IoniconsIconName;
  size?: keyof Theme['size']['icon'];
  color?: IconColor;
};

export function Icon({ name, size = 'md', color = 'primary' }: Props) {
  const theme = useTheme();
  const resolved = useIconColor(color);

  return (
    <Ionicons
      name={name}
      size={theme.size.icon[size]}
      color={resolved}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

export function useIconColor(color: IconColor): string {
  return useTheme().color[ICON_TOKEN[color]];
}

const ICON_TOKEN = {
  primary: 'iconPrimary',
  secondary: 'iconSecondary',
  disabled: 'iconDisabled',
  brand: 'iconBrand',
  onBrand: 'iconOnBrand',
  onAccent: 'textOnAccent',
  inverse: 'textInverse',
  onVendorDark: 'textOnVendorDark',
  onActionElevated: 'iconOnActionElevated',
  onBrandFaint: 'iconOnBrandFaint',
  onNeutralSubtle: 'iconOnNeutralSubtle',
  success: 'textSuccess',
  warning: 'textWarning',
  error: 'textError',
  notice: 'iconNotice',
  warningOnInverse: 'iconWarningOnInverse',
  benefit: 'iconBenefit',
} as const satisfies Record<IconColor, string>;
