import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import type { ComponentType } from 'react';
import type { SvgProps } from 'react-native-svg';
import { useTheme } from '@/core/design-system/theme-provider';
import ArcLogo from '@/assets/icons/networks/arc.svg';
import BaseLogo from '@/assets/icons/networks/base.svg';
import MonadLogo from '@/assets/icons/networks/monad.svg';
import SolanaLogo from '@/assets/icons/networks/solana.svg';
import UsdcLogo from '@/assets/icons/tokens/usdc.svg';
import UsdtLogo from '@/assets/icons/tokens/usdt.svg';
import JupiterMark from '@/assets/images/jupiter.png';
import { CountryFlag } from './country-flag';
import { Text } from './text';
import type { Theme } from '@/core/design-system';

type Props = {
  symbol: string;
  size?: keyof Theme['size']['avatar'];
  badgeSymbol?: string;
  badgeCountryCode?: string;
};

const LOGOS: Record<string, ComponentType<SvgProps>> = {
  SOLANA: SolanaLogo,
  SOL: SolanaLogo,
  BASE: BaseLogo,
  MONAD: MonadLogo,
  ARC: ArcLogo,
  USDC: UsdcLogo,
  USDT: UsdtLogo,
};

const RASTER_LOGOS: Record<string, ImageSourcePropType> = {
  JUPITER: JupiterMark,
};

const LOGO_RATIO = 0.62;
const BADGE_RATIO = 0.42;
const SMALL_MARK = 28;

export function AssetMark({ symbol, size = 'lg', badgeSymbol, badgeCountryCode }: Props) {
  const theme = useTheme();
  const diameter = theme.size.avatar[size];
  const badgeSize = Math.round(diameter * BADGE_RATIO);

  const badge =
    badgeCountryCode !== undefined ? (
      <CountryFlag code={badgeCountryCode} diameter={badgeSize} />
    ) : badgeSymbol !== undefined ? (
      <Mark symbol={badgeSymbol} diameter={badgeSize} />
    ) : undefined;

  return (
    <View accessibilityElementsHidden importantForAccessibility="no">
      <Mark symbol={symbol} diameter={diameter} />

      {badge !== undefined && (
        <View
          style={[
            styles.badge,
            { borderRadius: theme.radius.pill, height: badgeSize, width: badgeSize },
          ]}
        >
          {badge}
        </View>
      )}
    </View>
  );
}

function Mark({ symbol, diameter }: { symbol: string; diameter: number }) {
  const theme = useTheme();
  const Logo = LOGOS[symbol.toUpperCase()];
  const raster = RASTER_LOGOS[symbol.toUpperCase()];

  return (
    <View
      style={[
        styles.circle,
        {
          backgroundColor: theme.color.bgSurface,
          borderColor: theme.color.borderSubtle,
          borderRadius: theme.radius.pill,
          borderWidth: theme.borderWidth.thin,
          height: diameter,
          width: diameter,
        },
      ]}
    >
      {raster !== undefined ? (
        <Image
          testID="asset-mark-raster"
          source={raster}
          style={{ height: diameter, width: diameter }}
        />
      ) : Logo === undefined ? (
        <Text variant={diameter < SMALL_MARK ? 'label.s' : 'numeric.s'} color="brand">
          {symbol.slice(0, 2).toUpperCase()}
        </Text>
      ) : (
        <Logo width={diameter * LOGO_RATIO} height={diameter * LOGO_RATIO} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  badge: { bottom: -2, position: 'absolute', right: -2 },
});
