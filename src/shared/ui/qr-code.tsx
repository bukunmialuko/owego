import { StyleSheet, View } from 'react-native';
import QRCodeStyled from 'react-native-qrcode-styled';
import { ThemeScope, useTheme } from '@/core/design-system/theme-provider';

type Props = {
  value: string;
  size?: number;
  accessibilityLabel: string;
};

export function QrCode(props: Props) {
  return (
    <ThemeScope mode="light">
      <QrCodeBody {...props} />
    </ThemeScope>
  );
}

function QrCodeBody({ value, size, accessibilityLabel }: Props) {
  const theme = useTheme();
  const measure = size ?? DEFAULT_SIZE;
  const color = theme.color.textPrimary;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.frame,
        {
          backgroundColor: theme.color.bgSurfaceSunken,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.lg,
        },
      ]}
    >
      <QRCodeStyled
        data={value}
        size={measure}
        color={color}
        errorCorrectionLevel="H"
        pieceCornerType="rounded"
        pieceBorderRadius="50%"
        outerEyesOptions={{ borderRadius: '30%', color }}
        innerEyesOptions={{ borderRadius: '50%', color }}
      />
    </View>
  );
}

const DEFAULT_SIZE = 220;

const styles = StyleSheet.create({
  frame: { alignItems: 'center', alignSelf: 'center', justifyContent: 'center' },
});
