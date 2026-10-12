import { useTranslation } from 'react-i18next';
import { Card, HStack, Text } from '@/shared/ui';
import type { Beneficiary } from '../../../domain/entity/beneficiary';
import { BeneficiaryMark } from '../../widget/beneficiary-mark';
import { beneficiaryTitle } from '../../widget/beneficiary-text';

export function BeneficiaryCard({ beneficiary }: { beneficiary: Beneficiary }) {
  const { t } = useTranslation();

  return (
    <Card variant="sunken" radius="md" padding="md">
      <HStack gap="md" align="center">
        <BeneficiaryMark beneficiary={beneficiary} tint="surface" />
        <Text variant="heading.h5" style={styles.name}>
          {beneficiaryTitle(beneficiary, t)}
        </Text>
      </HStack>
    </Card>
  );
}

const styles = { name: { flex: 1 } } as const;
