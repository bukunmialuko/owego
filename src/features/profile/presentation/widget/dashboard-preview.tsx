import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import {
  AvatarSilhouette,
  AvatarStrip,
  Button,
  HStack,
  Icon,
  IconButton,
  Text,
  VStack,
  flagFor,
  type AvatarStripItem,
} from '@/shared/ui';
import ScanGlyph from '@/assets/icons/scan.svg';

type Props = {
  name: string;
  balance: { major: string; minor: string };
  secondary: { label: string; countryCode: string };
  quickSend: AvatarStripItem[];
  maxHeight?: number | undefined;
};

const PREVIEW_SCALE = 342 / 393;
const STATUS_BAR_HEIGHT = 56;
const PREVIEW_CLOCK = '9:41';

function noop() {}

export function DashboardPreview({ name, balance, secondary, quickSend, maxHeight }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [dashboardHeight, setDashboardHeight] = useState(0);
  const shownHeight = dashboardHeight + theme.spacing.xs;
  const scale =
    maxHeight === undefined || dashboardHeight === 0
      ? PREVIEW_SCALE
      : Math.min(PREVIEW_SCALE, maxHeight / shownHeight);

  const topCorners = {
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
  };

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        theme.elevation.card,
        topCorners,
        styles.card,
        {
          backgroundColor: theme.color.bgSurface,
          height: shownHeight * scale,
          width: width * scale,
        },
      ]}
    >
      <View style={[topCorners, styles.clip]}>
        <View
          testID="previewed-dashboard"
          onLayout={(event) => {
            setDashboardHeight(event.nativeEvent.layout.height);
          }}
          style={[styles.dashboard, { width, transform: [{ scale }] }]}
        >
          <HStack
            justify="space-between"
            style={{
              height: STATUS_BAR_HEIGHT,
              paddingLeft: theme.spacing.xxxl,
              paddingRight: theme.spacing.xxl,
              paddingTop: theme.spacing.sm,
            }}
          >
            <Text variant="body.mEmphasis">{PREVIEW_CLOCK}</Text>
            <HStack gap="xs">
              <Icon name="cellular" size="sm" />
              <Icon name="wifi" size="sm" />
              <Icon name="battery-full" size="md" />
            </HStack>
          </HStack>

          <HStack paddingX="lg" paddingY="sm" justify="space-between" gap="sm">
            <HStack gap="sm" style={styles.identity}>
              <AvatarSilhouette size="md" />
              <Text variant="heading.h5" numberOfLines={1}>
                {name}
              </Text>
              <Icon name="chevron-forward" size="xs" color="secondary" />
            </HStack>

            <IconButton
              label={t('home.scanToPay')}
              glyph={ScanGlyph}
              color="brand"
              onPress={noop}
            />
          </HStack>

          <VStack align="center" gap="md" paddingY="lg">
            <HStack gap="xs">
              <Text variant="body.s" color="secondary">
                {t('home.availableBalance')}
              </Text>
              <Icon name="eye-outline" size="sm" color="secondary" />
            </HStack>

            <Text variant="numeric.xl" numberOfLines={1}>
              {balance.major}
              <Text variant="numeric.m">{balance.minor}</Text>
            </Text>

            <HStack background="neutral" radius="pill" paddingX="md" paddingY="xs" gap="xs">
              <Text variant="body.s">{flagFor(secondary.countryCode)}</Text>
              <Text variant="label.m" color="secondary">
                {secondary.label}
              </Text>
            </HStack>

            <Button label={t('home.makePayment')} icon="paper-plane" onPress={noop} size="md" />
          </VStack>

          {quickSend.length > 0 && (
            <VStack gap="sm" paddingTop="sm">
              <HStack paddingX="lg" gap="xs">
                <Icon name="flash" size="sm" color="secondary" />
                <Text variant="body.mMedium" color="secondary">
                  {t('home.quickSend')}
                </Text>
              </HStack>

              <AvatarStrip items={quickSend} onSelect={noop} />
            </VStack>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'center' },
  clip: { flex: 1, overflow: 'hidden' },
  dashboard: { transformOrigin: 'top left' },
  identity: { flexShrink: 1 },
});
