import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Pressable, StyleSheet } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useTheme } from '@/core/design-system/theme-provider';
import { Card, HStack, Icon, Text, VStack } from '@/shared/ui';

type Props = { code: string };

const CONFIRM_MS = 2000;

export function ReferralCodeCard({ code }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    if (!hasCopied) return undefined;

    const timer = setTimeout(() => {
      setHasCopied(false);
    }, CONFIRM_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [hasCopied]);

  return (
    <Card variant="sunken" radius="sm" padding="none" paddingX="md" paddingY="sm">
      <HStack justify="space-between" gap="md">
        <VStack style={styles.copy}>
          <Text variant="label.s" color="secondary">
            {t('refer.referralCode')}
          </Text>
          <Text variant="heading.h5" selectable numberOfLines={1}>
            {code}
          </Text>
        </VStack>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hasCopied ? t('refer.codeCopied') : t('refer.copyCode')}
          hitSlop={theme.spacing.md}
          onPress={() => {
            Clipboard.setString(code);
            setHasCopied(true);
            AccessibilityInfo.announceForAccessibility(t('refer.codeCopied'));
          }}
        >
          <Icon name={hasCopied ? 'checkmark' : 'copy'} size="sm" color="brand" />
        </Pressable>
      </HStack>
    </Card>
  );
}

const styles = StyleSheet.create({ copy: { flexShrink: 1 } });
