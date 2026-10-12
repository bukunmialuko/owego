import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ThemeScope, useTheme } from '@/core/design-system/theme-provider';
import type { Theme } from '@/core/design-system';
import { Button } from './button';
import { Icon } from './icon';
import { Text } from './text';
import { VStack } from './stack';

export type PromoTone = 'flights' | 'insurance' | 'esim';

type Props = {
  title: string;
  description: string;
  tone: PromoTone;
  artwork?: React.ReactNode;
  heightRatio?: number;
  descriptionRatio?: number;
  actionLabel?: string;
  onPress: () => void;
};

const TONE: Record<PromoTone, keyof Theme['color']> = {
  flights: 'fillPromoFlights',
  insurance: 'fillPromoInsurance',
  esim: 'fillPromoEsim',
};

export function PromoCard(props: Props) {
  return (
    <ThemeScope mode="light">
      <PromoCardBody {...props} />
    </ThemeScope>
  );
}

function PromoCardBody({
  title,
  description,
  tone,
  artwork,
  heightRatio,
  descriptionRatio,
  actionLabel,
  onPress,
}: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const cardWidth = width - theme.spacing.lg * 2;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${description}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.color[TONE[tone]],
          borderRadius: theme.radius.lg,
          opacity: pressed ? theme.opacity.pressed : theme.opacity.full,
          ...(heightRatio === undefined ? {} : { minHeight: cardWidth * heightRatio }),
        },
      ]}
    >
      {artwork !== undefined && (
        <View style={styles.artwork} pointerEvents="none">
          {artwork}
        </View>
      )}

      <VStack align="center" gap="xs" padding="lg">
        <Text variant="heading.h4" align="center">
          {title}
        </Text>
        <Text
          variant="body.xs"
          align="center"
          style={
            descriptionRatio === undefined ? undefined : { width: cardWidth * descriptionRatio }
          }
        >
          {description}
        </Text>

        {actionLabel === undefined ? (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={[
              styles.arrow,
              {
                backgroundColor: theme.color.bgInverse,
                borderRadius: theme.radius.pill,
                height: theme.size.control.sm,
                marginTop: theme.spacing.sm,
                width: theme.size.control.sm,
              },
            ]}
          >
            <Icon name="arrow-forward" size="md" color="onBrand" />
          </View>
        ) : (
          <Button
            variant="dark"
            size="md"
            label={actionLabel}
            icon="arrow-forward"
            iconPosition="trailing"
            onPress={onPress}
            style={{ marginTop: theme.spacing.sm }}
          />
        )}
      </VStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  artwork: { bottom: 0, left: 0, position: 'absolute', right: 0 },
  arrow: { alignItems: 'center', justifyContent: 'center' },
});
