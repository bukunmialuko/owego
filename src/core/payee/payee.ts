import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';

export type PayeeTint = 'neutral' | 'brand' | 'success' | 'error' | 'warning';

export type PayeeDestination =
  | {
      kind: 'bankTransfer';
      prefill: { currency: string; method: string; values: Record<string, string> };
    }
  | { kind: 'walletSend'; prefill: { address: string; networkCode?: string } }
  | { kind: 'merchantPay'; qrString: string }
  | { kind: 'details' };

export type Payee = {
  id: string;
  name: string;
  detail?: string;
  countryCode?: string;
  tint: PayeeTint;
  destination: PayeeDestination;
};

export const PAYEE_QUERY_ROOT = ['payee'] as const;

export interface PayeePort {
  getRecent(limit: number): Promise<Result<Payee[], AppError>>;
}
