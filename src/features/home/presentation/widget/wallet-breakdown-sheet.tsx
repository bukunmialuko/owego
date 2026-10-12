import { useTranslation } from 'react-i18next';
import { formatTokenAmount } from '@/core/wallet/format-token-amount';
import type { StablecoinHolding } from '@/core/wallet/stablecoin-holdings';
import { AssetMark, BottomSheet, ListRow } from '@/shared/ui';
import { BALANCE_MASK } from './balance-card';

type Props = {
  isOpen: boolean;
  holdings: StablecoinHolding[];
  isHidden: boolean;
  locale: string;
  onClose: () => void;
};

export function WalletBreakdownSheet({ isOpen, holdings, isHidden, locale, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <BottomSheet
      isOpen={isOpen}
      title={t('home.walletBreakdown')}
      closeLabel={t('common.close')}
      onClose={onClose}
      hasCloseButton
    >
      {holdings.map((holding) => (
        <ListRow
          key={holding.symbol}
          title={holding.symbol}
          subtitle={
            isHidden ? BALANCE_MASK : formatTokenAmount(holding.amount, holding.symbol, locale)
          }
          leading={<AssetMark symbol={holding.symbol} />}
        />
      ))}
    </BottomSheet>
  );
}
