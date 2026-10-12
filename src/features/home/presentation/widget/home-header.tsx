import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';
import { AccountAvatar } from '@/core/avatar/account-avatar';
import { useTheme } from '@/core/design-system/theme-provider';
import { HStack, Icon, IconButton, Text } from '@/shared/ui';
import ScanGlyph from '@/assets/icons/scan.svg';

type Props = {
  name: string;
  onPressProfile: () => void;
  onPressScan: () => void;
};

export function HomeHeader({ name, onPressProfile, onPressScan }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <HStack paddingX="lg" paddingY="sm" justify="space-between" gap="sm">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.profile')}
        onPress={onPressProfile}
        style={[styles.identity, { gap: theme.spacing.sm }]}
      >
        <AccountAvatar name={firstWordOf(name)} size="md" />
        <Text variant="heading.h5" numberOfLines={1}>
          {name}
        </Text>
        <Icon name="chevron-forward" size="xs" color="secondary" />
      </Pressable>

      <HStack gap="sm">
        <IconButton
          label={t('home.scanToPay')}
          glyph={ScanGlyph}
          color="brand"
          onPress={onPressScan}
        />
      </HStack>
    </HStack>
  );
}

function firstWordOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

const styles = StyleSheet.create({
  identity: { alignItems: 'center', flexDirection: 'row', flexShrink: 1 },
});
