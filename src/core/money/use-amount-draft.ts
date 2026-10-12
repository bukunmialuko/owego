import { useCallback, useMemo, useState } from 'react';
import {
  EMPTY_DRAFT,
  appendDecimal,
  appendDigit,
  deleteLast,
  formatDraft,
  fromMinor,
  fromNumber,
  isEmpty,
  isWellFormed,
  toMinor,
  toNumber,
  type AmountDraft,
  type FormattedAmount,
} from './amount-draft';
import { fractionDigitsFor, type CurrencyCode } from './money';

type AmountKeyPress = 'decimal' | 'delete' | (string & {});

export type AmountDraftController = {
  draft: AmountDraft;
  value: number;
  minor: number;
  formatted: FormattedAmount;
  isPristine: boolean;
  allowDecimal: boolean;
  press: (key: AmountKeyPress) => void;
  setValue: (value: number) => void;
  setMinor: (minor: number) => void;
  restore: (draft: AmountDraft) => void;
  reset: () => void;
};

export function useAmountDraft(currency: CurrencyCode, locale: string): AmountDraftController {
  const maxFractionDigits = fractionDigitsFor(currency);
  const [draft, setDraft] = useState<AmountDraft>(EMPTY_DRAFT);

  const press = useCallback(
    (key: AmountKeyPress) => {
      setDraft((current) => {
        if (key === 'delete') return deleteLast(current);
        if (key === 'decimal') return appendDecimal(current, maxFractionDigits);

        return appendDigit(current, key, maxFractionDigits);
      });
    },
    [maxFractionDigits],
  );

  const setValue = useCallback(
    (value: number) => {
      setDraft(fromNumber(value, maxFractionDigits));
    },
    [maxFractionDigits],
  );

  const setMinor = useCallback(
    (minor: number) => {
      setDraft(fromMinor(minor, maxFractionDigits));
    },
    [maxFractionDigits],
  );

  const reset = useCallback(() => {
    setDraft(EMPTY_DRAFT);
  }, []);

  const restore = useCallback((next: AmountDraft) => {
    setDraft(isWellFormed(next) ? next : EMPTY_DRAFT);
  }, []);

  const formatted = useMemo(() => formatDraft(draft, locale, currency), [draft, locale, currency]);

  return {
    draft,
    value: toNumber(draft),
    minor: toMinor(draft, maxFractionDigits),
    formatted,
    isPristine: isEmpty(draft),
    allowDecimal: maxFractionDigits > 0,
    press,
    setValue,
    setMinor,
    restore,
    reset,
  };
}
