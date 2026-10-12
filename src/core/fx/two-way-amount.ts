import { convert, invert } from './convert';
import type { FxQuote } from './fx-rate';

type Figure = { currency: string; minor: number };

export type TwoWayAmount = {
  quoteMinor: number;
  counterpart: Figure;
};

export function priceTwoWay(typed: Figure, quote: FxQuote): TwoWayAmount {
  if (typed.currency === quote.quoteCurrency) {
    return {
      quoteMinor: typed.minor,
      counterpart: { currency: quote.baseCurrency, minor: convert(typed.minor, invert(quote)) },
    };
  }

  if (typed.currency !== quote.baseCurrency) {
    throw new TypeError(
      `${typed.currency} is neither side of a ${quote.baseCurrency}/${quote.quoteCurrency} quote.`,
    );
  }

  const quoteMinor = convert(typed.minor, quote);

  return { quoteMinor, counterpart: { currency: quote.quoteCurrency, minor: quoteMinor } };
}
