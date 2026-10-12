import { useTranslation } from 'react-i18next';
import { Avatar, Card, Text, TransactionRow, VStack } from '@/shared/ui';
import type { DayGroup } from '../../util/group-by-day';

export type EarningsRow = {
  id: string;
  name: string;
  subtitle: string;
  trailing: string;
  badge: 'credited' | 'pending';
};

type Props = { groups: DayGroup<EarningsRow>[] };

export function EarningsList({ groups }: Props) {
  const { t } = useTranslation();

  return (
    <VStack gap="xl">
      {groups.map((group) => (
        <VStack key={group.key} gap="sm">
          <Text variant="body.mMedium" color="secondary">
            {group.dayKey === undefined ? group.day : t(group.dayKey)}
          </Text>

          <Card variant="sunken" padding="none" paddingX="sm">
            {group.items.map((row) => (
              <TransactionRow
                key={row.id}
                title={row.name}
                subtitle={row.subtitle}
                amount={row.trailing}
                leading={<Avatar name={row.name} size="lg" tint="surface" badge={row.badge} />}
              />
            ))}
          </Card>
        </VStack>
      ))}
    </VStack>
  );
}
