import { RefreshControl, type RefreshControlProps } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';

export function PullToRefresh(props: RefreshControlProps) {
  const theme = useTheme();

  return (
    <RefreshControl
      tintColor={theme.color.iconSecondary}
      colors={[theme.color.fillBrandStrong]}
      progressBackgroundColor={theme.color.bgSurface}
      {...props}
    />
  );
}
