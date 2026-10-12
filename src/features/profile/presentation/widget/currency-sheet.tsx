import { useTranslation } from 'react-i18next';
import { CountryFlag, SelectSheet } from '@/shared/ui';
import {
  displayCurrencies,
  useDisplayCurrency,
} from '@/core/display-currency/use-display-currency';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function CurrencySheet({ isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const { code, select } = useDisplayCurrency();

  return (
    <SelectSheet
      isOpen={isOpen}
      title={t('profile.defaultCurrency')}
      subtitle={t('profile.stablecoinNote')}
      closeLabel={t('common.close')}
      selectedId={code}
      emptyMessage={t('common.errorOccurredTryAgain')}
      options={displayCurrencies().map((currency) => ({
        id: currency.code,
        title: currency.code,
        subtitle: currency.name,
        leading: <CountryFlag code={currency.country_code} size="md" />,
      }))}
      onSelect={(id) => {
        select(id);
        onClose();
      }}
      onClose={onClose}
    />
  );
}
