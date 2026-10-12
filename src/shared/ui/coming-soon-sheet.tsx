import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemeScope, useTheme } from '@/core/design-system/theme-provider';
import ComingSoonCoins from '@/assets/illustrations/coming-soon-coins.svg';
import ComingSoonPlanes from '@/assets/illustrations/coming-soon-planes.svg';
import { BottomSheet } from './bottom-sheet';
import { VStack } from './stack';
import { Text } from './text';

const PLANES = { width: 378, height: 166 };
const COINS = { width: 101, height: 116 };
const COINS_TOP_INSET = 68;
const BODY_WRAP_WIDTH = 184;

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function ComingSoonSheet(props: Props) {
  return (
    <ThemeScope mode="light">
      <ComingSoonSheetBody {...props} />
    </ThemeScope>
  );
}

function ComingSoonSheetBody({ isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <BottomSheet
      isOpen={isOpen}
      closeLabel={t('common.close')}
      onClose={onClose}
      hasCloseButton
      closeTone="onTint"
      backdrop={
        <View style={[styles.ground, { backgroundColor: theme.color.fillPromoComingSoon }]}>
          <ComingSoonPlanes width={PLANES.width} height={PLANES.height} />
        </View>
      }
    >
      <VStack align="center" gap="md" paddingBottom="xxl" style={{ paddingTop: COINS_TOP_INSET }}>
        <ComingSoonCoins width={COINS.width} height={COINS.height} />

        <VStack align="center" gap="xs">
          <Text variant="heading.h6" align="center">
            {t('common.comingSoonTitle')}
          </Text>
          <Text
            variant="body.s"
            color="secondary"
            align="center"
            style={{ maxWidth: BODY_WRAP_WIDTH }}
          >
            {t('common.comingSoonBody')}
          </Text>
        </VStack>
      </VStack>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  ground: { alignItems: 'center', flex: 1 },
});
