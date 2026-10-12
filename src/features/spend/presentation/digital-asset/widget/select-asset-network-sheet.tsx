import { useTranslation } from 'react-i18next';
import { AssetMark, SelectSheet } from '@/shared/ui';
import type { AssetNetwork } from '../../../domain/entity/asset-transfer';

type Props = {
  isOpen: boolean;
  networks: AssetNetwork[];
  selectedCode: string;
  onSelect: (network: AssetNetwork) => void;
  onClose: () => void;
};

export function SelectAssetNetworkSheet({
  isOpen,
  networks,
  selectedCode,
  onSelect,
  onClose,
}: Props) {
  const { t } = useTranslation();

  return (
    <SelectSheet
      isOpen={isOpen}
      title={t('spend.selectNetwork')}
      closeLabel={t('common.close')}
      emptyMessage={t('spend.noNetworks')}
      selectedId={selectedCode}
      options={networks.map((network) => ({
        id: network.code,
        title: network.name,
        subtitle: network.networkLabel,
        leading: <AssetMark symbol={network.code} size="md" />,
        disabled: !network.isEnabled,
      }))}
      onSelect={(code) => {
        const network = networks.find((candidate) => candidate.code === code);
        if (network !== undefined) onSelect(network);
      }}
      onClose={onClose}
    />
  );
}
