import { Image, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import GoogleMark from '@/assets/icons/google.svg';
import BrandMark from '@/assets/icons/owego-mark.svg';
import background from '@/assets/images/background.jpg';
import { ThemeScope, useTheme } from '@/core/design-system/theme-provider';
import { Button, LegalLinks, Text, VStack } from '@/shared/ui';
import { useCountrySelection } from './hook/use-country-selection';
import { useSignIn } from './hook/use-sign-in';
import { CountryRow } from './widget/country-row';

const MARK_WIDTH = 112;
const MARK_ASPECT = 112 / 29;

export function AuthLandingScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { selected, selectedCountry, options, select } = useCountrySelection();
  const { signIn, pending, isBusy } = useSignIn();

  const canSignIn = selected !== undefined;

  return (
    <View style={[styles.container, { backgroundColor: theme.color.bgPhoto }]}>
      <Image
        accessibilityIgnoresInvertColors
        source={background}
        resizeMode="cover"
        style={styles.background}
      />

      <View style={[styles.scrim, { backgroundColor: theme.color.bgScrim }]} />

      <VStack
        gap="xxl"
        paddingX="lg"
        style={{ paddingBottom: theme.spacing.xl, paddingTop: insets.top + theme.spacing.xl }}
      >
        <VStack gap="xl" align="center">
          <View accessible accessibilityRole="image" accessibilityLabel={t('auth.brandAlt')}>
            <BrandMark width={MARK_WIDTH} height={MARK_WIDTH / MARK_ASPECT} />
          </View>

          <VStack gap="xs" align="center">
            <Text variant="heading.h3" color="onScrim" align="center">
              {t('auth.landingHeadline')}
            </Text>
            <Text variant="body.s" color="onScrim" align="center">
              {t('auth.landingSubhead')}
            </Text>
          </VStack>
        </VStack>

        <VStack gap="md">
          <VStack paddingY="sm">
            <CountryRow selected={selectedCountry} options={options} onSelect={select} />
          </VStack>

          <ThemeScope mode="light">
            <Button
              label={t('auth.signInWithGoogle')}
              variant="secondary"
              glyph={GoogleMark}
              disabled={!canSignIn || isBusy}
              isLoading={pending === 'google'}
              onPress={() => {
                void signIn('google');
              }}
            />
          </ThemeScope>

          {Platform.OS === 'ios' && (
            <Button
              label={t('auth.signInWithApple')}
              variant="vendor"
              icon="logo-apple"
              disabled={!canSignIn || isBusy}
              isLoading={pending === 'apple'}
              onPress={() => {
                void signIn('apple');
              }}
            />
          )}

          <VStack paddingY="sm">
            <LegalLinks prefix={t('common.termsPrefix')} color="onScrim" />
          </VStack>
        </VStack>
      </VStack>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { height: '100%', left: 0, position: 'absolute', top: 0, width: '100%' },
  container: { flex: 1 },
  scrim: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
});
