import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, type LayoutRectangle } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import { formatMinorExact } from '@/core/money/money';
import { AssetMark, Chip, DropdownMenu, Skeleton } from '@/shared/ui';
import type { FundingOption } from '../../domain/asset/funding-token';
import type { SendableToken } from '../../domain/asset/send-networks';

const TOKEN_CHIP_WIDTH = 132;

type Props = {
  options: readonly FundingOption[];
  selected: SendableToken | undefined;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  onSelect: (token: SendableToken) => void;
};

export function TokenPicker({ options, selected, isPending, isError, onRetry, onSelect }: Props) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const chipRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<LayoutRectangle | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);

  if (isPending && selected === undefined) {
    return <Skeleton width={TOKEN_CHIP_WIDTH} height={theme.size.control.md} radius="pill" />;
  }

  function open() {
    if (isError) onRetry();

    chipRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setIsOpen(true);
    });
  }

  return (
    <View ref={chipRef} collapsable={false}>
      <Chip
        label={selected ?? t('spend.tokenLabel')}
        accessibilityLabel={
          selected === undefined ? t('spend.tokenLabel') : `${t('spend.tokenLabel')}, ${selected}`
        }
        {...(selected === undefined ? {} : { leading: <AssetMark symbol={selected} size="sm" /> })}
        hasChevron
        isExpanded={isOpen}
        {...(isPending ? {} : { onPress: open })}
      />

      <DropdownMenu
        isOpen={isOpen}
        anchor={anchor}
        closeLabel={t('common.close')}
        emptyMessage={t(isError ? 'spend.balanceUnavailable' : 'spend.noWalletsToSend')}
        {...(selected === undefined ? {} : { selectedId: selected })}
        options={options.map((option) => ({
          id: option.symbol,
          title: option.symbol,
          subtitle: formatMinorExact(option.balanceMinor, option.symbol, i18n.language),
          leading: <AssetMark symbol={option.symbol} size="md" />,
        }))}
        onSelect={(id) => {
          const token = options.find((option) => option.symbol === id)?.symbol;
          if (token !== undefined) onSelect(token);
          setIsOpen(false);
        }}
        onClose={() => {
          setIsOpen(false);
        }}
      />
    </View>
  );
}
