import type { DepositTokenSymbol } from '../../domain/entity/deposit-token';

export type ExternalWalletDepositParamList = {
  Deposit: undefined;
  Result: { amountMinor: number; tokenSymbol: DepositTokenSymbol; signature: string | null };
};
