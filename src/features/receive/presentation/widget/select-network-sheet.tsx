import { useTranslation } from 'react-i18next';
import { AssetMark, SelectSheet } from '@/shared/ui';
import type { Chain } from '../../domain/entity/receive-entity';

type Props = {
  isOpen: boolean;
  chains: Chain[];
  selectedCode: string;
  onSelect: (chain: Chain) => void;
  onClose: () => void;
};

export function SelectNetworkSheet({ isOpen, chains, selectedCode, onSelect, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <SelectSheet
      isOpen={isOpen}
      title={t('receive.selectNetwork')}
      closeLabel={t('common.close')}
      emptyMessage={t('receive.noNetworks')}
      selectedId={selectedCode}
      options={chains.map((chain) => ({
        id: chain.code,
        title: chain.name,
        subtitle: chain.networkLabel,
        trailing: `${chain.estimatedTime} · ${t('receive.networkFee', {
          percent: chain.depositFeePercent,
        })}`,
        leading: <AssetMark symbol={chain.code} size="md" />,
        disabled: !chain.isEnabled,
      }))}
      onSelect={(code) => {
        const chain = chains.find((candidate) => candidate.code === code);
        if (chain !== undefined) onSelect(chain);
      }}
      onClose={onClose}
    />
  );
}
