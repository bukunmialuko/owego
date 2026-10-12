import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/core/design-system/theme-provider';
import { IconButton } from './icon-button';
import { Text } from './text';

type Align = 'center' | 'leading';

type Props = {
  title?: string;
  onBack?: () => void;
  onClose?: () => void;
  closePosition?: 'leading' | 'trailing';
  align?: Align;
  tone?: 'neutral' | 'surface';
  trailing?: React.ReactNode;
};

export function ScreenHeader({
  title,
  onBack,
  onClose,
  closePosition = 'trailing',
  align = 'center',
  tone = 'neutral',
  trailing,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const hasBack = onBack !== undefined;
  const hasClose = onClose !== undefined;
  const isCentred = align === 'center';
  const isCloseLeading = hasClose && closePosition === 'leading';

  const closeButton = hasClose ? (
    <IconButton icon="close" label={t('common.close')} tone={tone} onPress={onClose} />
  ) : undefined;

  return (
    <View style={[styles.header, { gap: theme.spacing.md, minHeight: theme.size.control.md }]}>
      {hasBack ? (
        <IconButton icon="chevron-back" label={t('common.back')} tone={tone} onPress={onBack} />
      ) : isCloseLeading ? (
        closeButton
      ) : (
        isCentred && <Spacer />
      )}

      {title === undefined ? (
        <View style={isCentred ? styles.grow : undefined} />
      ) : (
        <Text
          variant="heading.h5"
          align={isCentred ? 'center' : 'left'}
          numberOfLines={1}
          style={isCentred ? styles.grow : styles.shrink}
        >
          {title}
        </Text>
      )}

      {!isCentred && <View style={styles.grow} />}

      {trailing}

      {hasClose && !isCloseLeading
        ? closeButton
        : trailing === undefined && isCentred && <Spacer />}
    </View>
  );
}

function Spacer() {
  const theme = useTheme();

  return <View style={{ width: theme.size.control.md }} />;
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row' },
  grow: { flex: 1 },
  shrink: { flexShrink: 1 },
});
