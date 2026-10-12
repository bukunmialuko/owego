import { useTranslation } from 'react-i18next';
import { AssetMark, SelectSheet } from '@/shared/ui';

type Props = {
  isOpen: boolean;
  tokens: string[];
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
  onClose: () => void;
};

export function SelectTokenSheet({ isOpen, tokens, selectedSymbol, onSelect, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <SelectSheet
      isOpen={isOpen}
      title={t('receive.selectToken')}
      closeLabel={t('common.close')}
      emptyMessage={t('receive.noNetworks')}
      selectedId={selectedSymbol}
      options={tokens.map((symbol) => ({
        id: symbol,
        title: symbol,
        leading: <AssetMark symbol={symbol} size="md" />,
      }))}
      onSelect={onSelect}
      onClose={onClose}
    />
  );
}
