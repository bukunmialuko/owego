import { err, ok } from '@/core/result/result';
import { unknownError } from '@/core/errors/app-error';
import type {
  CreditScore,
  Loan,
  LoanHistory,
  LoanMovement,
  LoanOffer,
  LoanQuote,
} from '../../domain/entity/credit-entity';
import type { CreditRepository } from '../../domain/repository/credit-repository';

const SCORE: CreditScore = {
  value: 72,
  deltaPoints: 24,
  deltaDays: 7,
  ceilingMinor: 50_000,
  currency: 'USD',
};

const REPAYMENT_REWARD_POINTS = 10;

const OFFER: LoanOffer = {
  minMinor: 2_500,
  maxMinor: 50_000,
  feePercent: 1.2,
  termDays: 30,
  currency: 'USD',
};

const HISTORY: LoanHistory = {
  totalBorrowedMinor: 23_000,
  loansCompleted: 2,
  onTimeRatePercent: 50,
  currency: 'USD',
};

const DUE_DATE = '2026-08-25T00:00:00.000Z';

export function createPreviewCreditRepository(): CreditRepository {
  let activeLoan: Loan | undefined = {
    id: 'loan-1',
    principalMinor: 18_000,
    feePercent: OFFER.feePercent,
    repayableMinor: 18_216,
    repaidMinor: 4_200,
    currency: 'USD',
    dueDate: DUE_DATE,
  };

  const movements: LoanMovement[] = [
    {
      id: 'm1',
      kind: 'repayment',
      amountMinor: 5_000,
      currency: 'USD',
      createdAt: '2026-08-19T23:17:00.000Z',
    },
    {
      id: 'm2',
      kind: 'disbursement',
      amountMinor: 5_000,
      currency: 'USD',
      createdAt: '2026-08-19T23:17:00.000Z',
    },
    {
      id: 'm3',
      kind: 'repayment',
      amountMinor: 5_000,
      currency: 'USD',
      createdAt: '2026-08-18T23:17:00.000Z',
    },
  ];

  function quote(principalMinor: number): LoanQuote {
    const feeMinor = Math.round((principalMinor * OFFER.feePercent) / 100);

    return {
      principalMinor,
      feeMinor,
      repayableMinor: principalMinor + feeMinor,
      currency: OFFER.currency,
      dueDate: DUE_DATE,
    };
  }

  return {
    getScore: () => Promise.resolve(ok(SCORE)),
    getActiveLoan: () => Promise.resolve(ok(activeLoan)),
    getHistory: () => Promise.resolve(ok(HISTORY)),
    getMovements: () => Promise.resolve(ok([...movements])),
    getOffer: () => Promise.resolve(ok(OFFER)),
    quoteLoan: (principalMinor) => Promise.resolve(ok(quote(principalMinor))),

    takeLoan: (principalMinor) => {
      const priced = quote(principalMinor);
      activeLoan = {
        id: `loan-${String(movements.length + 1)}`,
        principalMinor,
        feePercent: OFFER.feePercent,
        repayableMinor: priced.repayableMinor,
        repaidMinor: 0,
        currency: priced.currency,
        dueDate: priced.dueDate,
      };
      movements.unshift({
        id: `m${String(movements.length + 1)}`,
        kind: 'disbursement',
        amountMinor: principalMinor,
        currency: priced.currency,
        createdAt: DUE_DATE,
      });

      return Promise.resolve(ok(activeLoan));
    },

    repay: (amountMinor) => {
      if (activeLoan === undefined) return Promise.resolve(err(unknownError()));

      activeLoan = { ...activeLoan, repaidMinor: activeLoan.repaidMinor + amountMinor };
      movements.unshift({
        id: `m${String(movements.length + 1)}`,
        kind: 'repayment',
        amountMinor,
        currency: activeLoan.currency,
        createdAt: DUE_DATE,
      });

      return Promise.resolve(ok({ loan: activeLoan, scoreDeltaPoints: REPAYMENT_REWARD_POINTS }));
    },
  };
}
