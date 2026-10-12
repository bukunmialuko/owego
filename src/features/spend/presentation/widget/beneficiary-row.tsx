import { useTranslation } from 'react-i18next';
import { ListRow } from '@/shared/ui';
import type { Beneficiary } from '../../domain/entity/beneficiary';
import { BeneficiaryMark } from './beneficiary-mark';
import { beneficiarySubtitle, beneficiaryTitle } from './beneficiary-text';

type Props = {
  beneficiary: Beneficiary;
  onPress: () => void;
  disabled?: boolean;
};

export function BeneficiaryRow({ beneficiary, onPress, disabled = false }: Props) {
  const { t } = useTranslation();

  return (
    <ListRow
      title={beneficiaryTitle(beneficiary, t)}
      subtitle={beneficiarySubtitle(beneficiary)}
      leading={<BeneficiaryMark beneficiary={beneficiary} />}
      hasChevron
      disabled={disabled}
      onPress={onPress}
    />
  );
}
