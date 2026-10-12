import {
  SCORE_TIERS,
  isSettled,
  outstandingMinor,
  repaymentProgress,
  tierFor,
  type Loan,
} from './credit-entity';

function aLoan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 'l1',
    principalMinor: 18000,
    feePercent: 1.2,
    repayableMinor: 18216,
    repaidMinor: 4200,
    currency: 'USD',
    dueDate: '2026-08-25',
    ...overrides,
  };
}

describe('tierFor', () => {
  it.each([
    [0, 'atRisk'],
    [39, 'atRisk'],
    [40, 'building'],
    [69, 'building'],
    [70, 'good'],
    [100, 'good'],
  ])('places %i in %s', (score, expected) => {
    expect(tierFor(score).id).toBe(expected);
  });

  it('clamps a score outside the range rather than returning nothing', () => {
    expect(tierFor(-10).id).toBe('atRisk');
    expect(tierFor(150).id).toBe('good');
  });

  it('covers every value from 0 to 100 with no gaps', () => {
    for (let score = 0; score <= 100; score += 1) {
      expect(SCORE_TIERS.some((tier) => score >= tier.min && score <= tier.max)).toBe(true);
    }
  });
});

describe('loan arithmetic', () => {
  it('reports what is still owed', () => {
    expect(outstandingMinor(aLoan())).toBe(14016);
  });

  it('never reports a negative outstanding balance', () => {
    expect(outstandingMinor(aLoan({ repaidMinor: 20000 }))).toBe(0);
  });

  it('treats a fully repaid loan as settled', () => {
    expect(isSettled(aLoan({ repaidMinor: 18216 }))).toBe(true);
    expect(isSettled(aLoan({ repaidMinor: 18215 }))).toBe(false);
  });

  describe('repayment progress', () => {
    it('is a fraction of the repayable total', () => {
      expect(repaymentProgress(aLoan({ repaidMinor: 9108 }))).toBeCloseTo(0.5);
    });

    it('caps at one when overpaid', () => {
      expect(repaymentProgress(aLoan({ repaidMinor: 30000 }))).toBe(1);
    });

    it('is zero rather than NaN when nothing is owed', () => {
      expect(repaymentProgress(aLoan({ repayableMinor: 0, repaidMinor: 0 }))).toBe(0);
    });
  });
});
