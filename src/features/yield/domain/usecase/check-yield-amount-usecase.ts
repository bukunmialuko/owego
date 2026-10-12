export type YieldAmountCheck = 'empty' | 'exceedsCeiling' | 'unknownCeiling' | 'ok';

export function checkYieldAmount({
  amountMinor,
  ceilingMinor,
}: {
  amountMinor: number;
  ceilingMinor: number | undefined;
}): YieldAmountCheck {
  if (amountMinor <= 0) return 'empty';
  if (ceilingMinor === undefined) return 'unknownCeiling';

  return amountMinor > ceilingMinor ? 'exceedsCeiling' : 'ok';
}
