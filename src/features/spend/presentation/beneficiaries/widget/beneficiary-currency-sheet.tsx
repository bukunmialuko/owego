import { useTranslation } from 'react-i18next';
import type { CurrencyDto } from '@/core/reference-data/reference-data';
import { CountryFlag, SelectSheet } from '@/shared/ui';
import {
  isPayableByScan,
  isSaveableByForm,
  payoutCurrencies,
} from '../../../domain/corridor/registry';

type Props = {
  isOpen: boolean;
  selectedCode?: string;
  onSelect: (currency: CurrencyDto) => void;
  onClose: () => void;
};

export function BeneficiaryCurrencySheet({ isOpen, selectedCode, onSelect, onClose }: Props) {
  const { t } = useTranslation();
  const currencies = payoutCurrencies();

  return (
    <SelectSheet
      isOpen={isOpen}
      title={t('spend.selectCurrency')}
      closeLabel={t('common.close')}
      emptyMessage={t('common.noItemsFound')}
      searchPlaceholder={t('spend.searchBeneficiaries')}
      {...(selectedCode === undefined ? {} : { selectedId: selectedCode })}
      options={currencies.map((candidate) => ({
        id: candidate.code,
        title: candidate.name,
        subtitle: candidate.code,
        leading: <CountryFlag code={candidate.country_code} size="md" />,
        disabled: !isSaveableByForm(candidate) && !isPayableByScan(candidate),
      }))}
      onSelect={(code) => {
        const chosen = currencies.find((candidate) => candidate.code === code);
        if (chosen !== undefined) onSelect(chosen);
      }}
      onClose={onClose}
    />
  );
}
