import { useTranslation } from 'react-i18next';
import { BottomSheet, ListRow } from '@/shared/ui';
import type { EsimPlan } from '../../domain/entity/esim-entity';
import { formatTravelPrice } from '../../util/format';

type Props = {
  isOpen: boolean;
  plans: EsimPlan[];
  selectedId?: string | undefined;
  onSelect: (plan: EsimPlan) => void;
  onClose: () => void;
};

export function PlanPickerSheet({ isOpen, plans, selectedId, onSelect, onClose }: Props) {
  const { t, i18n } = useTranslation();

  return (
    <BottomSheet
      isOpen={isOpen}
      title={t('travel.dataPlan')}
      closeLabel={t('common.close')}
      onClose={onClose}
      hasCloseButton
    >
      {plans.map((plan) => (
        <ListRow
          key={plan.id}
          title={t('travel.planLabel', { data: plan.dataLabel, days: plan.durationDays })}
          trailing={formatTravelPrice(plan.priceMinor, plan.currency, i18n.language)}
          selected={plan.id === selectedId}
          onPress={() => {
            onSelect(plan);
          }}
        />
      ))}
    </BottomSheet>
  );
}
