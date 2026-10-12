import { useTranslation } from 'react-i18next';
import { AssetMark, Chip } from '@/shared/ui';
import type { YieldTarget } from '../../domain/entity/yield-entity';

type Props = {
  target: YieldTarget;
  onPress?: () => void;
};

export function ProductChip({ target, onPress }: Props) {
  const { t } = useTranslation();

  return (
    <Chip
      label={t('yield.vaultName', { token: target.tokenSymbol })}
      leading={<AssetMark symbol={target.tokenSymbol} size="sm" />}
      {...(onPress === undefined ? {} : { onPress, hasChevron: true })}
    />
  );
}
