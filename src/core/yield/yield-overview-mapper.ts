import { usdToMinorDown, usdToMinorNearest } from '@/core/money/usd-number';
import type { StakedVaultDto, YieldSummaryDto } from './yield-overview-model';
import type { YieldChange, YieldOverview, YieldPosition } from './yield-overview';

const YIELD_CURRENCY = 'USD';

function changeOf(depositedUsd: number, profitUsd: number, percent: number) {
  if (depositedUsd <= 0) return {};

  const change: YieldChange = { percent, amountMinor: usdToMinorNearest(profitUsd) };

  return { change };
}

function toPosition(vault: StakedVaultDto): YieldPosition {
  return {
    id: vault.vault_address,
    tokenSymbol: vault.token,
    tokenMint: vault.token_id,
    valueMinor: usdToMinorDown(vault.staked_usdc),
    currency: YIELD_CURRENCY,
    ...(vault.total_rate === undefined ? {} : { apyPercent: vault.total_rate }),
    ...(vault.deposited_usdc > 0
      ? { contributedMinor: usdToMinorNearest(vault.deposited_usdc) }
      : {}),
    ...changeOf(vault.deposited_usdc, vault.profit_usdc, vault.profit_percent),
  };
}

export function toYieldOverview({
  summary,
  products,
}: {
  summary: YieldSummaryDto;
  products: StakedVaultDto[];
}): YieldOverview {
  return {
    valueMinor: usdToMinorDown(summary.total_staked_usdc),
    currency: YIELD_CURRENCY,
    ...changeOf(
      summary.total_deposited_usdc,
      summary.total_profit_usdc,
      summary.total_profit_percent,
    ),
    positions: products.map(toPosition),
  };
}
