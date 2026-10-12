import { useTranslation } from 'react-i18next';
import { Chip, Icon } from '@/shared/ui';

export function BalanceChip({ balance }: { balance: string }) {
  const { t } = useTranslation();

  return (
    <Chip
      label={balance}
      accessibilityLabel={`${t('spend.balanceLabel')}, ${balance}`}
      leading={<Icon name="wallet-outline" size="sm" color="secondary" />}
    />
  );
}
