import type { TranslationKey } from '@/core/i18n/translation-key';

export const SCORE_TIERS = [
  { id: 'atRisk', labelKey: 'credit.tierAtRisk', min: 0, max: 39 },
  { id: 'building', labelKey: 'credit.tierBuilding', min: 40, max: 69 },
  { id: 'good', labelKey: 'credit.tierGood', min: 70, max: 100 },
] as const satisfies readonly { id: string; labelKey: TranslationKey; min: number; max: number }[];

export type ScoreTier = (typeof SCORE_TIERS)[number];

export type CreditScore = {
  value: number;
  deltaPoints: number;
  deltaDays: number;
  ceilingMinor: number;
  currency: string;
};

export type Loan = {
  id: string;
  principalMinor: number;
  feePercent: number;
  repayableMinor: number;
  repaidMinor: number;
  currency: string;
  dueDate: string;
};

export type LoanHistory = {
  totalBorrowedMinor: number;
  loansCompleted: number;
  onTimeRatePercent: number;
  currency: string;
};

export function tierFor(score: number): ScoreTier {
  const clamped = Math.min(Math.max(score, 0), 100);

  return SCORE_TIERS.find((tier) => clamped >= tier.min && clamped <= tier.max) ?? SCORE_TIERS[0];
}

export function isSettled(loan: Loan): boolean {
  return loan.repaidMinor >= loan.repayableMinor;
}

export function outstandingMinor(loan: Loan): number {
  return Math.max(loan.repayableMinor - loan.repaidMinor, 0);
}

export function repaymentProgress(loan: Loan): number {
  if (loan.repayableMinor <= 0) return 0;

  return Math.min(loan.repaidMinor / loan.repayableMinor, 1);
}

export type LoanOffer = {
  minMinor: number;
  maxMinor: number;
  feePercent: number;
  termDays: number;
  currency: string;
};

export type LoanQuote = {
  principalMinor: number;
  feeMinor: number;
  repayableMinor: number;
  currency: string;
  dueDate: string;
};

export type LoanRepayment = {
  loan: Loan;
  scoreDeltaPoints: number;
};

type LoanMovementKind = 'disbursement' | 'repayment';

export type LoanMovement = {
  id: string;
  kind: LoanMovementKind;
  amountMinor: number;
  currency: string;
  createdAt: string;
};

export function isWithinOffer(principalMinor: number, offer: LoanOffer): boolean {
  return principalMinor >= offer.minMinor && principalMinor <= offer.maxMinor;
}
