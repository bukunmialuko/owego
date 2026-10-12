import { formatMinor } from '@/core/money/money';

const REWARD_CURRENCY = 'USD';

export function formatRewardAmount(amountMinor: number, currency: string, locale: string): string {
  return formatMinor(amountMinor, currency, locale, REWARD_CURRENCY);
}
