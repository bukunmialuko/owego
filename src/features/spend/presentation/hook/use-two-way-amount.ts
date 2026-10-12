import { useState } from 'react';
import type { FxQuote } from '@/core/fx/fx-rate';
import { priceTwoWay, type TwoWayAmount } from '@/core/fx/two-way-amount';
import { fromMinor, type AmountDraft } from '@/core/money/amount-draft';
import {
  apiMinorToField,
  fieldMinorToApi,
  fractionDigitsFor,
  type CurrencyCode,
} from '@/core/money/money';
import { useAmountDraft, type AmountDraftController } from '@/core/money/use-amount-draft';

type ReturnTrip = { currency: CurrencyCode; draft: AmountDraft; landed: AmountDraft };

type Options = {
  wallet: CurrencyCode;
  destination: CurrencyCode;
  quote: FxQuote | null | undefined;
  locale: string;
};

export type TwoWayAmountField = {
  amount: AmountDraftController;
  typedCurrency: CurrencyCode;
  otherCurrency: CurrencyCode;
  typedApiMinor: number;
  destinationMinor: number;
  counterpart: TwoWayAmount['counterpart'] | undefined;
  canSwitch: boolean;
  switchCurrency: () => void;
};

export function useTwoWayAmount({
  wallet,
  destination,
  quote,
  locale,
}: Options): TwoWayAmountField {
  const [typedCurrency, setTypedCurrency] = useState<CurrencyCode>(wallet);
  const [returnTrip, setReturnTrip] = useState<ReturnTrip | null>(null);
  const amount = useAmountDraft(typedCurrency, locale);

  const otherCurrency = typedCurrency === destination ? wallet : destination;
  const typedApiMinor = fieldMinorToApi(amount.minor, typedCurrency);
  const priced =
    quote == null
      ? undefined
      : priceTwoWay({ currency: typedCurrency, minor: typedApiMinor }, quote);
  const canSwitch = priced !== undefined && wallet !== destination;

  return {
    amount,
    typedCurrency,
    otherCurrency,
    typedApiMinor,
    destinationMinor: priced?.quoteMinor ?? 0,
    counterpart: priced?.counterpart,
    canSwitch,
    switchCurrency: () => {
      if (priced === undefined || !canSwitch) return;

      const isGoingBack =
        returnTrip !== null &&
        returnTrip.currency === otherCurrency &&
        isSameDraft(returnTrip.landed, amount.draft);
      const landed = isGoingBack
        ? returnTrip.draft
        : fromMinor(
            apiMinorToField(priced.counterpart.minor, otherCurrency),
            fractionDigitsFor(otherCurrency),
          );

      setReturnTrip({ currency: typedCurrency, draft: amount.draft, landed });
      amount.restore(landed);
      setTypedCurrency(otherCurrency);
    },
  };
}

function isSameDraft(a: AmountDraft, b: AmountDraft): boolean {
  return a.whole === b.whole && a.fraction === b.fraction;
}
