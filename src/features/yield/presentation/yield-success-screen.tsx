import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/core/design-system/theme-provider';
import type { TranslationKey } from '@/core/i18n/translation-key';
import { formatMinorTrimmed } from '@/core/money/money';
import { Badge, Button, Card, Gradient, Screen, ScreenHeader, Text, VStack } from '@/shared/ui';
import MoveArt from '@/assets/illustrations/hand-coins.svg';
import type { YieldEnding } from '../domain/entity/yield-move-outcome';
import { MoveSummary } from './widget/move-summary';
import { ProductIdentity } from './widget/product-identity';
import type { YieldParamList } from './yield-param-list';

const HEADER_HEIGHT = 207;

const ART = { width: 138, height: 115 };

const RESULT: Record<
  YieldEnding,
  { title: TranslationKey; tone: 'success' | 'warning' | 'error'; detail?: TranslationKey }
> = {
  succeeded: { title: 'yield.transactionSuccessful', tone: 'success' },
  processing: {
    title: 'yield.moveProcessing',
    tone: 'warning',
    detail: 'yield.moveProcessingDetail',
  },
  unconfirmed: {
    title: 'yield.moveUnconfirmed',
    tone: 'warning',
    detail: 'yield.moveUnconfirmedDetail',
  },
  failedOnChain: {
    title: 'yield.moveFailedOnChain',
    tone: 'error',
    detail: 'yield.moveFailedOnChainDetail',
  },
};

export function YieldSuccessScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<YieldParamList>>();
  const { target, quote, ending } = useRoute<RouteProp<YieldParamList, 'Success'>>().params;
  const result = RESULT[ending];
  const isSucceeded = ending === 'succeeded';

  function dismiss() {
    navigation.popToTop();
  }

  return (
    <Screen
      scroll
      clampsOverscroll
      {...(isSucceeded
        ? {
            backdrop: (
              <Gradient name="successHeader" style={[styles.band, { height: HEADER_HEIGHT }]} />
            ),
          }
        : {})}
      footer={<Button label={t('common.done')} onPress={dismiss} />}
    >
      <VStack paddingX="lg" gap="xl">
        <ScreenHeader closePosition="leading" tone="surface" onClose={dismiss} />

        {isSucceeded && (
          <>
            <View pointerEvents="none" style={styles.art}>
              <MoveArt testID="yield-move-art" width={ART.width} height={ART.height} />
            </View>
            <View style={{ height: ART.height - theme.size.control.md }} />
          </>
        )}

        <VStack align="center" gap="lg">
          <Text variant="display.2xl" accessibilityRole="header">
            {formatMinorTrimmed(quote.amountMinor, quote.currency, i18n.language)}
          </Text>
          <Badge tone={result.tone} size="md" label={t(result.title)} />
          {result.detail !== undefined && (
            <Text variant="body.m" color="secondary" align="center">
              {t(result.detail)}
            </Text>
          )}
        </VStack>

        <VStack gap="xs">
          <Card variant="sunken" radius="lg" padding="md">
            <ProductIdentity
              tokenSymbol={target.tokenSymbol}
              variant="investment"
              {...(target.apyPercent === undefined ? {} : { apyPercent: target.apyPercent })}
            />
          </Card>
          <MoveSummary quote={quote} />
        </VStack>
      </VStack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  band: { left: 0, position: 'absolute', right: 0, top: 0 },
  art: { alignItems: 'center', left: 0, position: 'absolute', right: 0, top: 0 },
});
