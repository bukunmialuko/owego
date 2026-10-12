import { useTranslation } from 'react-i18next';
import { Card, HStack, Text, VStack } from '@/shared/ui';

type Props = {
  title: string;
  subtitle: string;
  accessibleValue: string;
  variant?: 'compact' | 'full';
  mark?: React.ReactNode;
};

export function RecipientCard({
  title,
  subtitle,
  accessibleValue,
  variant = 'compact',
  mark,
}: Props) {
  const { t } = useTranslation();
  const isFull = variant === 'full';

  return (
    <Card
      variant="sunken"
      radius="lg"
      padding="md"
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${t('common.to')}, ${accessibleValue}`}
    >
      <HStack gap="md">
        {isFull ? (
          mark
        ) : (
          <Text variant="body.s" color="secondary">
            {`${t('common.to')}:`}
          </Text>
        )}

        <VStack gap="xxs" style={styles.body}>
          <Text variant="body.mEmphasis" numberOfLines={1}>
            {title}
          </Text>
          <Text variant="body.m" color="tertiary" numberOfLines={1}>
            {subtitle}
          </Text>
        </VStack>
      </HStack>
    </Card>
  );
}

const styles = { body: { flexShrink: 1 } } as const;
