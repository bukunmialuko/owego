import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type {
  CreditScore,
  Loan,
  LoanHistory,
  LoanMovement,
  LoanOffer,
  LoanQuote,
  LoanRepayment,
} from '../entity/credit-entity';

export interface CreditRepository {
  getScore(): Promise<Result<CreditScore | undefined, AppError>>;
  getActiveLoan(): Promise<Result<Loan | undefined, AppError>>;
  getHistory(): Promise<Result<LoanHistory | undefined, AppError>>;
  getMovements(): Promise<Result<LoanMovement[], AppError>>;
  getOffer(): Promise<Result<LoanOffer | undefined, AppError>>;
  quoteLoan(principalMinor: number): Promise<Result<LoanQuote, AppError>>;
  takeLoan(principalMinor: number): Promise<Result<Loan, AppError>>;
  repay(amountMinor: number): Promise<Result<LoanRepayment, AppError>>;
}
