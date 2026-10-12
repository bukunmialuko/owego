import { useTranslation } from 'react-i18next';
import BalanceCoinArt from '@/assets/illustrations/balance-coin.svg';
import { formatMinor, splitAmount } from '@/core/money/money';
import type { AvailableBalance } from '@/core/wallet/available-balance';
import { formatTokenAmount } from '@/core/wallet/format-token-amount';
import type { StablecoinHolding } from '@/core/wallet/stablecoin-holdings';
import { AssetMark, Card, HStack, Skeleton, Text, VStack } from '@/shared/ui';

const BALANCE_COIN_WIDTH = 38;
const BALANCE_COIN_HEIGHT = 47;

type Props = {
  total: AvailableBalance | undefined;
  tokens: StablecoinHolding[];
  isLoading: boolean;
  hasFailed: boolean;
  locale: string;
};

export function BalanceSummaryCard({ total, tokens, isLoading, hasFailed, locale }: Props) {
  const { t } = useTranslation();

  return (
    <Card padding="md" gap="md">
      <HStack justify="space-between" align="flex-start" gap="md">
        <VStack gap="xxs">
          <Text variant="body.s" color="secondary">
            {t('home.availableBalance')}
          </Text>

          {isLoading ? (
            <Skeleton width={160} height={32} />
          ) : (
            <Text variant="numeric.l">
              {hasFailed || total === undefined ? (
                t('home.balanceUnavailable')
              ) : (
                <TotalFigure formatted={formatMinor(total.amountMinor, total.currency, locale)} />
              )}
            </Text>
          )}
        </VStack>

        <BalanceCoinArt
          testID="balance-coin-art"
          width={BALANCE_COIN_WIDTH}
          height={BALANCE_COIN_HEIGHT}
        />
      </HStack>

      {tokens.length > 0 && (
        <HStack
          testID="balance-token-panel"
          background="surfaceSunken"
          radius="md"
          padding="md"
          gap="md"
          wrap
        >
          {tokens.map((token) => (
            <HStack key={token.symbol} gap="sm" style={{ flexGrow: 1, flexBasis: '40%' }}>
              <AssetMark symbol={token.symbol} size="sm" />
              <VStack gap="none">
                <Text variant="body.mEmphasis">{token.symbol}</Text>
                <Text variant="body.s" color="tertiary">
                  {formatTokenAmount(token.amount, token.symbol, locale)}
                </Text>
              </VStack>
            </HStack>
          ))}
        </HStack>
      )}
    </Card>
  );
}

function TotalFigure({ formatted }: { formatted: string }) {
  const { major, minor } = splitAmount(formatted);

  return (
    <>
      {major}
      {minor !== '' && <Text variant="numeric.s">{minor}</Text>}
    </>
  );
}
