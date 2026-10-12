import type { SendableToken } from './send-networks';

export type FundingOption = {
  symbol: SendableToken;
  balanceMinor: number;
};

const PREFERRED_TOKEN: SendableToken = 'USDC';

export function resolveFundingToken(
  options: readonly FundingOption[],
  chosen?: string,
): SendableToken | undefined {
  const held = (symbol: string | undefined) =>
    options.find((option) => option.symbol === symbol)?.symbol;

  return held(chosen) ?? held(PREFERRED_TOKEN) ?? options[0]?.symbol;
}
