import { pricePayout, type PayoutFigures } from './payout-quote';

const NAIRA_FIGURES: PayoutFigures = {
  recipientGetsMinor: 150_000,
  recipientUsdMinor: 100,
  feeUsdMinor: 25,
  totalUsdMinor: 125,
  localPerUsd: 1_500,
};

describe('pricePayout', () => {
  it("prices the fee in the destination currency at the backend's rate", () => {
    expect(pricePayout(NAIRA_FIGURES, 'NGN')).toEqual({
      destination: {
        recipientGetsMinor: 150_000,
        feeMinor: 37_500,
        totalMinor: 187_500,
        currency: 'NGN',
      },
      wallet: { recipientGetsMinor: 100, feeMinor: 25, totalMinor: 125, currency: 'USD' },
      rate: 1_500,
    });
  });

  it("shows the backend's dollar total rather than converting the local one back", () => {
    const quote = pricePayout({ ...NAIRA_FIGURES, totalUsdMinor: 126 }, 'NGN');

    expect(quote?.wallet.totalMinor).toBe(126);
  });

  it('charges a dollar payout its fee in dollars, with no conversion', () => {
    const quote = pricePayout(
      {
        recipientGetsMinor: 5_000,
        recipientUsdMinor: 5_000,
        feeUsdMinor: 50,
        totalUsdMinor: 5_050,
        localPerUsd: 0,
      },
      'USD',
    );

    expect(quote).toEqual({
      destination: { recipientGetsMinor: 5_000, feeMinor: 50, totalMinor: 5_050, currency: 'USD' },
      wallet: { recipientGetsMinor: 5_000, feeMinor: 50, totalMinor: 5_050, currency: 'USD' },
      rate: 1,
    });
  });

  describe('refuses figures it cannot stand behind', () => {
    it.each([
      ['no rate for a converted payout', { ...NAIRA_FIGURES, localPerUsd: 0 }, 'NGN'],
      ['a rate that is not a number', { ...NAIRA_FIGURES, localPerUsd: Number.NaN }, 'NGN'],
      ['a negative fee', { ...NAIRA_FIGURES, feeUsdMinor: -25 }, 'NGN'],
      ['nothing for the recipient', { ...NAIRA_FIGURES, recipientGetsMinor: 0 }, 'NGN'],
      ['nothing leaving the wallet', { ...NAIRA_FIGURES, totalUsdMinor: 0 }, 'NGN'],
      ['a figure that is not whole minor units', { ...NAIRA_FIGURES, feeUsdMinor: 2.5 }, 'NGN'],
      ['an answer priced in another currency', { ...NAIRA_FIGURES, currency: 'KES' }, 'NGN'],
    ])('%s', (_case, figures: PayoutFigures, currency) => {
      expect(pricePayout(figures, currency)).toBeUndefined();
    });

    it('accepts an answer that names the currency it was asked for', () => {
      expect(pricePayout({ ...NAIRA_FIGURES, currency: 'NGN' }, 'NGN')).toBeDefined();
    });
  });
});
