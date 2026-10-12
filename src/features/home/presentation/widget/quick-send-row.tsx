import { useTranslation } from 'react-i18next';
import { AvatarStrip, HStack, Icon, Text, VStack, type AvatarTint } from '@/shared/ui';
import type { Payee, PayeeTint } from '@/core/payee/payee';

type Props = {
  payees: Payee[];
  onSelect: (payee: Payee) => void;
};

const TONE: Record<PayeeTint, AvatarTint> = {
  neutral: 'neutral',
  brand: 'brand',
  success: 'success',
  error: 'error',
  warning: 'warning',
};

export function QuickSendRow({ payees, onSelect }: Props) {
  const { t } = useTranslation();

  if (payees.length === 0) return null;

  return (
    <VStack gap="sm">
      <HStack paddingX="lg" gap="xs">
        <Icon name="flash" size="sm" color="secondary" />
        <Text variant="body.mMedium" color="secondary">
          {t('home.quickSend')}
        </Text>
      </HStack>

      <AvatarStrip
        items={payees.map((payee) => ({
          id: payee.id,
          label: payee.name,
          tint: TONE[payee.tint],
        }))}
        onSelect={(id) => {
          const payee = payees.find((candidate) => candidate.id === id);
          if (payee !== undefined) onSelect(payee);
        }}
      />
    </VStack>
  );
}
