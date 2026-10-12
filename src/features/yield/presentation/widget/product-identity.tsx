import { useTranslation } from 'react-i18next';
import { AssetMark, HStack, Text, VStack } from '@/shared/ui';
import { formatApy } from '../../util/format-apy';

type Props = {
  tokenSymbol: string;
  apyPercent?: number;
  variant: 'vault' | 'investment';
};

export function useProductIdentity({ tokenSymbol, apyPercent, variant }: Props) {
  const { t, i18n } = useTranslation();
  const apy = apyPercent === undefined ? undefined : formatApy(apyPercent, i18n.language);
  const provider = t('yield.providerJupiter');

  const title =
    variant === 'vault'
      ? t('yield.vaultName', { token: tokenSymbol })
      : t('yield.investmentYield', { token: tokenSymbol });
  const subtitle =
    variant === 'vault'
      ? apy === undefined
        ? provider
        : t('yield.productTerms', { provider, apy })
      : apy === undefined
        ? undefined
        : t('yield.apyTerms', { apy });

  return {
    title,
    subtitle,
    accessibilityLabel: subtitle === undefined ? title : `${title}, ${subtitle}`,
  };
}

export function ProductIdentity(props: Props) {
  const { title, subtitle } = useProductIdentity(props);

  return (
    <HStack gap="md">
      <AssetMark
        symbol={props.tokenSymbol}
        {...(props.variant === 'vault' ? { badgeSymbol: 'JUPITER' } : {})}
      />

      <VStack gap="xxs" style={{ flex: 1 }}>
        <Text variant="heading.h6" numberOfLines={1}>
          {title}
        </Text>
        {subtitle !== undefined && (
          <Text variant="body.m" color="tertiary" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </VStack>
    </HStack>
  );
}
