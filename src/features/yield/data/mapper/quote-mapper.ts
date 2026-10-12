import { usdToMinorDown, usdToMinorNearest, usdToMinorUp } from '@/core/money/usd-number';
import type { YieldQuote } from '../../domain/entity/yield-quote';
import type { DepositQuoteDto, WithdrawalQuoteDto } from '../model/yield-move-model';

function echoes(echoedUsd: number | undefined, amountMinor: number): boolean {
  return echoedUsd !== undefined && usdToMinorNearest(echoedUsd) === amountMinor;
}

export function toDepositQuote(dto: DepositQuoteDto, amountMinor: number): YieldQuote | undefined {
  if (!echoes(dto.stake_amount_usdc, amountMinor)) return undefined;

  let totalMinor: number;
  if (dto.total_debit_usdc !== undefined) totalMinor = usdToMinorUp(dto.total_debit_usdc);
  else if (dto.estimated_gas_usdc !== undefined) {
    totalMinor = amountMinor + usdToMinorUp(dto.estimated_gas_usdc);
  } else return undefined;

  const feeMinor = totalMinor - amountMinor;
  if (feeMinor < 0) return undefined;

  return { kind: 'deposit', amountMinor, feeMinor, totalMinor, currency: 'USD' };
}

export function toWithdrawalQuote(
  dto: WithdrawalQuoteDto,
  amountMinor: number,
): YieldQuote | undefined {
  if (!echoes(dto.withdraw_amount_usdc, amountMinor)) return undefined;

  let totalMinor: number;
  if (dto.net_received_usdc !== undefined) totalMinor = usdToMinorDown(dto.net_received_usdc);
  else if (dto.estimated_gas_usdc !== undefined) {
    totalMinor = amountMinor - usdToMinorUp(dto.estimated_gas_usdc);
  } else return undefined;

  const feeMinor = amountMinor - totalMinor;
  if (feeMinor < 0) return undefined;

  return { kind: 'withdrawal', amountMinor, feeMinor, totalMinor, currency: 'USD' };
}
