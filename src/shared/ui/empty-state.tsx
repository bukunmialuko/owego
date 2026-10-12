import { VStack } from './stack';
import { Text } from './text';

type Props = {
  title: string;
  description?: string;
  illustration?: React.ReactNode;
  action?: React.ReactNode;
};

export function EmptyState({ title, description, illustration, action }: Props) {
  return (
    <VStack
      accessible
      accessibilityRole="summary"
      accessibilityLabel={title}
      align="center"
      gap="sm"
      paddingX="xl"
      paddingY="xxl"
    >
      {illustration}

      <Text variant="heading.h6" align="center">
        {title}
      </Text>

      {description !== undefined && (
        <Text variant="body.s" color="secondary" align="center">
          {description}
        </Text>
      )}

      {action}
    </VStack>
  );
}
