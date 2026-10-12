import { formatDeltaPercent, formatMinor } from '@/core/money/money';
import type { YieldChange } from './yield-overview';

const YIELD_CURRENCY = 'USD';

export function describeYieldChange(
  change: YieldChange,
  locale: string,
): { percent: string; amount: string; isLoss: boolean } {
  return {
    percent: formatDeltaPercent(change.percent, locale),
    amount: formatMinor(change.amountMinor, YIELD_CURRENCY, locale),
    isLoss: change.amountMinor < 0,
  };
}
