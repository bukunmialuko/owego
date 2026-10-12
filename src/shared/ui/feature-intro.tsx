import type { ComponentType } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import { Button } from './button';
import { HStack, VStack } from './stack';
import { Text } from './text';
import { useIconColor } from './icon';

export type IntroBenefit = {
  id: string;
  glyph: ComponentType<SvgProps>;
  title: string;
  description: string;
};

type Props = {
  hero: (size: { width: number; height: number }) => React.ReactNode;
  heroRatio: number;
  heroLabel: string;
  benefits: IntroBenefit[];
  disclosure: string;
  disclosureLink?: { label: string; suffix: string; onPress: () => void };
  smallPrintPlacement?: 'aboveAction' | 'belowAction';
  actionLabel: string;
  onContinue: () => void;
};

const GLYPH_SIZE = 24;

export function FeatureIntro({
  hero,
  heroRatio,
  heroLabel,
  benefits,
  disclosure,
  disclosureLink,
  smallPrintPlacement = 'belowAction',
  actionLabel,
  onContinue,
}: Props) {
  const { width } = useWindowDimensions();
  const glyphColor = useIconColor('benefit');

  const action = <Button label={actionLabel} onPress={onContinue} />;
  const smallPrint = (
    <VStack gap="xxs">
      <Text variant="body.s" color="tertiary" align="center">
        {disclosure}
      </Text>

      {disclosureLink !== undefined && (
        <Text variant="body.s" color="tertiary" align="center">
          <Text
            variant="body.s"
            color="tertiary"
            style={styles.link}
            onPress={disclosureLink.onPress}
          >
            {disclosureLink.label}
          </Text>
          {` ${disclosureLink.suffix}`}
        </Text>
      )}
    </VStack>
  );

  return (
    <VStack gap="xl">
      <View accessible accessibilityRole="image" accessibilityLabel={heroLabel} style={styles.hero}>
        {hero({ width, height: width * heroRatio })}
      </View>

      <VStack paddingX="lg" gap="lg">
        {benefits.map(({ id, glyph: Glyph, title, description }) => (
          <HStack key={id} gap="md" align="flex-start">
            <Glyph width={GLYPH_SIZE} height={GLYPH_SIZE} color={glyphColor} />
            <VStack style={styles.copy} gap="xxs">
              <Text variant="body.mEmphasis">{title}</Text>
              <Text variant="body.s" color="secondary">
                {description}
              </Text>
            </VStack>
          </HStack>
        ))}

        {smallPrintPlacement === 'aboveAction' ? (
          <>
            {smallPrint}
            {action}
          </>
        ) : (
          <>
            {action}
            {smallPrint}
          </>
        )}
      </VStack>
    </VStack>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden' },
  copy: { flex: 1 },
  link: { textDecorationLine: 'underline' },
});
