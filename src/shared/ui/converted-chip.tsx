import { flagForCurrency } from './flag';
import { Skeleton } from './skeleton';
import { HStack, VStack } from './stack';
import { Text } from './text';

type Value = { kind: 'converted'; currency: string; label: string } | { kind: 'pending' };

const CHIP_HEIGHT = 36;

export function ConvertedChip({ value }: { value: Value }) {
  if (value.kind === 'pending') return <Skeleton width="30%" height={CHIP_HEIGHT} radius="pill" />;

  return (
    <VStack align="flex-start">
      <HStack background="neutral" radius="pill" padding="sm" gap="xs">
        <Text variant="body.s">{flagForCurrency(value.currency)}</Text>
        <Text variant="body.sMedium">{value.label}</Text>
      </HStack>
    </VStack>
  );
}
