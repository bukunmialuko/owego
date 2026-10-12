import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import { AvatarSilhouette } from '@/shared/ui';
import Orbit from '@/assets/illustrations/beneficiary-orbit.svg';

const ART_ASPECT = 393 / 168;

const SILHOUETTE_DIAMETER = 104;

export function BeneficiaryHero() {
  const theme = useTheme();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.frame, { aspectRatio: ART_ASPECT }]}
    >
      <Orbit
        width="100%"
        height="100%"
        color={theme.color.iconSecondary}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={{
          padding: theme.spacing.xs,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.color.fillNeutral,
        }}
      >
        <AvatarSilhouette diameter={SILHOUETTE_DIAMETER} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: 'center', justifyContent: 'center', width: '100%' },
});
