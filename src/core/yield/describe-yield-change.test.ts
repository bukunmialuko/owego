import { describeYieldChange } from './describe-yield-change';

describe('describeYieldChange', () => {
  it('signs a gain and keeps it out of the loss colour', () => {
    expect(describeYieldChange({ percent: 2.2, amountMinor: 33_635 }, 'en')).toEqual({
      percent: '+2.2%',
      amount: '$336.35',
      isLoss: false,
    });
  });

  it('signs a loss on both figures and marks it as one', () => {
    expect(describeYieldChange({ percent: -1.2, amountMinor: -410 }, 'en')).toEqual({
      percent: '-1.2%',
      amount: '-$4.10',
      isLoss: true,
    });
  });

  it('treats a flat return as no loss', () => {
    expect(describeYieldChange({ percent: 0, amountMinor: 0 }, 'en').isLoss).toBe(false);
  });
});
