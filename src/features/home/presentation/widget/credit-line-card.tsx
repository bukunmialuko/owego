import { Trans, useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import { HStack, Icon, Text, VStack } from '@/shared/ui';
import CreditLineArt from '@/assets/illustrations/credit-line-card.svg';

type Props = {
  limit: string;
  onPress: () => void;
};

const ARTWORK_WIDTH = 405;
const ARTWORK_HEIGHT = 97;
const COPY_INSET = 104;

export function CreditLineCard({ limit, onPress }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('home.creditPromoTitle')}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.color.fillPromoCredit,
          borderRadius: theme.radius.md,
          minHeight: ARTWORK_HEIGHT,
        },
      ]}
    >
      <View style={styles.artwork} pointerEvents="none">
        <CreditLineArt width={ARTWORK_WIDTH} height={ARTWORK_HEIGHT} />
      </View>

      <HStack paddingX="lg" paddingY="md" gap="md" align="center" style={styles.body}>
        <VStack style={styles.copy} gap="xxs">
          <Text variant="heading.h5">{t('home.creditPromoTitle')}</Text>
          <Text variant="body.s">
            <Trans
              i18nKey="home.creditPromoBody"
              values={{ amount: limit }}
              components={{ b: <Text variant="body.sEmphasis" /> }}
            />
          </Text>
        </VStack>
        <Icon name="arrow-forward" size="sm" color="brand" />
      </HStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { justifyContent: 'center', overflow: 'hidden' },
  artwork: {
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    top: 0,
  },
  body: { flex: 1 },
  copy: { flex: 1, paddingLeft: COPY_INSET },
});
