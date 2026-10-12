import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import BootSplash from 'react-native-bootsplash';
import background from '@/assets/images/background.jpg';
import BrandMark from '@/assets/icons/owego-mark.svg';
import { useTheme } from '@/core/design-system/theme-provider';
import { Button, LoadingAnimation, ProgressBar, Text, VStack } from '@/shared/ui';
import { useSplashBootstrap } from './hook/use-splash-bootstrap';

const MARK_WIDTH_RATIO = 0.28;
const MARK_ASPECT = 112 / 29;
const ANIMATION_SIZE = 96;

export function SplashScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { progress, isRevealed, hasTimedOut, retry } = useSplashBootstrap();

  useEffect(() => {
    void BootSplash.hide({ fade: true });
  }, []);

  const markWidth = MARK_WIDTH_RATIO * 393;

  return (
    <View style={[styles.container, { backgroundColor: theme.color.bgCanvas }]}>
      <Image
        accessibilityIgnoresInvertColors
        source={background}
        resizeMode="cover"
        style={styles.background}
      />

      <VStack style={styles.content} align="center" justify="center" gap="xxl">
        <View accessible accessibilityRole="image" accessibilityLabel={t('auth.brandAlt')}>
          <BrandMark width={markWidth} height={markWidth / MARK_ASPECT} />
        </View>

        {isRevealed && (
          <VStack gap="lg" align="center" style={styles.status}>
            {hasTimedOut ? (
              <>
                <Text variant="body.m" color="onScrim" align="center">
                  {t('errors.network.offline')}
                </Text>
                <Button label={t('splash.tryAgain')} onPress={retry} />
              </>
            ) : (
              <>
                <LoadingAnimation
                  size={ANIMATION_SIZE}
                  accessibilityLabel={t('splash.loadingLabel')}
                />
                <ProgressBar value={progress} accessibilityLabel={t('splash.loadingLabel')} />
              </>
            )}
          </VStack>
        )}
      </VStack>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { height: '100%', position: 'absolute', width: '100%' },
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24 },
  status: { width: '100%' },
});
