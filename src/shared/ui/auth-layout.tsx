import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/core/design-system/theme-provider';
import { Text } from './text';

type Props = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthLayout({ title, subtitle, children, footer }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.color.bgCanvas,
          paddingTop: insets.top + theme.spacing.xxl,
          paddingBottom: insets.bottom + theme.spacing.xl,
          paddingHorizontal: theme.spacing.xl,
        },
      ]}
    >
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel="owego"
        style={[
          styles.mark,
          { backgroundColor: theme.color.fillBrand, borderRadius: theme.radius.lg },
        ]}
      />

      <View style={{ gap: theme.spacing.sm, paddingTop: theme.spacing.xl }}>
        <Text variant="heading.h2">{title}</Text>
        <Text variant="body.m" color="secondary">
          {subtitle}
        </Text>
      </View>

      <View style={[styles.body, { gap: theme.spacing.lg, paddingTop: theme.spacing.xxl }]}>
        {children}
      </View>

      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mark: { height: 48, width: 48 },
  body: { flex: 1 },
});
