const CENT_DIGITS = 2;

export function toTokenBaseUnits(amountMinor: number, decimals: number): bigint | undefined {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return undefined;
  if (!Number.isInteger(decimals) || decimals < CENT_DIGITS) return undefined;

  return BigInt(amountMinor) * 10n ** BigInt(decimals - CENT_DIGITS);
}

export function baseUnitsToMinor(units: bigint, decimals: number): number | undefined {
  if (!Number.isInteger(decimals) || decimals < CENT_DIGITS) return undefined;

  const minor = units / 10n ** BigInt(decimals - CENT_DIGITS);
  return minor <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(minor) : undefined;
}
