import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Share, StyleSheet, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useTheme } from '@/core/design-system/theme-provider';
import { Banner, Button, HStack, Icon, QrCode, Text, VStack } from '@/shared/ui';
import CopyIcon from '@/assets/icons/copy_ic.svg';
import type { Chain, DepositAddress } from '../../domain/entity/receive-entity';

type Props = {
  chain: Chain;
  token: string;
  deposit: DepositAddress;
};

const CONFIRM_MS = 2000;

export function DepositAddressPanel({ chain, token, deposit }: Props) {
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
    <VStack gap="lg">
      <Banner tone="notice" message={t('receive.addressWarning', { token, network: chain.name })} />

      <VStack align="center" gap="lg" paddingX="lg">
        <QrCode
          value={deposit.address}
          accessibilityLabel={t('receive.qrLabel', { network: chain.name })}
        />

        <Text variant="body.mEmphasis" align="center" selectable>
          {deposit.address}
        </Text>

        <HStack background="neutral" radius="pill" paddingX="md" paddingY="sm" gap="sm">
          <Icon name="time-outline" size="sm" color="brand" />
          <Text variant="body.s" color="secondary">
            {t('receive.depositEta', { window: chain.estimatedTime })}
          </Text>
          <View style={[styles.divider, { backgroundColor: theme.color.borderSubtle }]} />
          <Text variant="body.s" color="secondary">
            {t('receive.depositFee', { percent: chain.depositFeePercent })}
          </Text>
        </HStack>

        <HStack gap="md" style={styles.actions}>
          <View style={styles.action}>
            <Button
              variant="secondary"
              textColor="brand"
              label={t('receive.share')}
              onPress={() => {
                void Share.share({
                  message: t('receive.shareMessage', {
                    network: chain.name,
                    address: deposit.address,
                  }),
                });
              }}
            />
          </View>

          <View style={styles.action}>
            <Button
              {...(hasCopied ? { icon: 'checkmark' } : { glyph: CopyIcon })}
              label={hasCopied ? t('receive.addressCopied') : t('receive.copyAddress')}
              onPress={() => {
                Clipboard.setString(deposit.address);
                setHasCopied(true);
                AccessibilityInfo.announceForAccessibility(t('receive.addressCopied'));
              }}
            />
          </View>
        </HStack>
      </VStack>
    </VStack>
  );
}

const styles = StyleSheet.create({
  divider: { height: 16, width: StyleSheet.hairlineWidth },
  actions: { alignSelf: 'stretch' },
  action: { flex: 1 },
});
