import type { FxQuote } from './fx-rate';

export function millisecondsUntilExpiry(
  quote: FxQuote | null | undefined,
  now: number,
): number | undefined {
  if (quote?.expiresAt === undefined) return undefined;

  const remaining = Date.parse(quote.expiresAt) - now;

  return remaining > 0 ? remaining : undefined;
}
