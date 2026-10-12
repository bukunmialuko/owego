import { formatCurrency, fractionDigitsFor, type CurrencyCode } from './money';

export type AmountDraft = {
  whole: string;
  fraction: string | null;
};

export const EMPTY_DRAFT: AmountDraft = { whole: '', fraction: null };

const DIGITS = /^\d*$/;

export function isWellFormed(draft: AmountDraft): boolean {
  return DIGITS.test(draft.whole) && (draft.fraction === null || DIGITS.test(draft.fraction));
}

const MAX_WHOLE_DIGITS = 12;

const NOISE_DIGITS = 6;

export function appendDigit(
  draft: AmountDraft,
  digit: string,
  maxFractionDigits: number,
): AmountDraft {
  if (!/^\d$/.test(digit)) return draft;

  if (draft.fraction !== null) {
    if (draft.fraction.length >= maxFractionDigits) return draft;

    return { ...draft, fraction: draft.fraction + digit };
  }

  if (draft.whole === '' || draft.whole === '0') {
    return { ...draft, whole: digit === '0' ? '0' : digit };
  }

  if (draft.whole.length >= MAX_WHOLE_DIGITS) return draft;

  return { ...draft, whole: draft.whole + digit };
}

export function appendDecimal(draft: AmountDraft, maxFractionDigits: number): AmountDraft {
  if (maxFractionDigits <= 0 || draft.fraction !== null) return draft;

  return { whole: draft.whole === '' ? '0' : draft.whole, fraction: '' };
}

export function deleteLast(draft: AmountDraft): AmountDraft {
  if (draft.fraction === null) return { ...draft, whole: draft.whole.slice(0, -1) };

  if (draft.fraction === '') return { ...draft, fraction: null };

  return { ...draft, fraction: draft.fraction.slice(0, -1) };
}

export function fromNumber(value: number, maxFractionDigits: number): AmountDraft {
  if (!Number.isFinite(value) || value <= 0) return EMPTY_DRAFT;

  const [whole = '0', digits = ''] = value.toFixed(maxFractionDigits + NOISE_DIGITS).split('.');

  if (whole.length > MAX_WHOLE_DIGITS) return EMPTY_DRAFT;
  if (maxFractionDigits <= 0) return { whole, fraction: null };

  return { whole, fraction: digits.slice(0, maxFractionDigits).padEnd(maxFractionDigits, '0') };
}

export function toNumber(draft: AmountDraft): number {
  if (!isWellFormed(draft)) return 0;

  const whole = draft.whole === '' ? '0' : draft.whole;
  const fraction = draft.fraction === null || draft.fraction === '' ? '0' : draft.fraction;

  return Number(`${whole}.${fraction}`);
}

export function toMinor(draft: AmountDraft, maxFractionDigits: number): number {
  if (!isWellFormed(draft)) return 0;

  const fraction = maxFractionDigits <= 0 ? '' : (draft.fraction ?? '');
  const digits = `${draft.whole}${fraction.slice(0, maxFractionDigits).padEnd(maxFractionDigits, '0')}`;

  return Number(digits.replace(/^0+(?=\d)/, '') || '0');
}

export function fromMinor(minor: number, maxFractionDigits: number): AmountDraft {
  if (!Number.isSafeInteger(minor) || minor <= 0) return EMPTY_DRAFT;

  if (maxFractionDigits <= 0) {
    const whole = String(minor);
    return whole.length > MAX_WHOLE_DIGITS ? EMPTY_DRAFT : { whole, fraction: null };
  }

  const digits = String(minor).padStart(maxFractionDigits + 1, '0');
  const whole = digits.slice(0, -maxFractionDigits);

  if (whole.length > MAX_WHOLE_DIGITS) return EMPTY_DRAFT;

  return { whole, fraction: digits.slice(-maxFractionDigits) };
}

export function isEmpty(draft: AmountDraft): boolean {
  return draft.whole === '' && draft.fraction === null;
}

export type FormattedAmount = {
  prefix: string;
  whole: string;
  decimalSeparator: string;
  fraction: string;
  typedFractionDigits: number;
  isDecimalActive: boolean;
  suffix: string;
};

export function formatDraft(
  draft: AmountDraft,
  locale: string,
  currency: CurrencyCode,
): FormattedAmount {
  const maxFractionDigits = fractionDigitsFor(currency);

  const formatted = formatCurrency(
    Number(draft.whole === '' ? '0' : draft.whole),
    currency,
    locale,
    0,
  );

  const { start, end } = digitSpan(formatted);

  return {
    prefix: formatted.slice(0, start),
    whole: formatted.slice(start, end),
    decimalSeparator: maxFractionDigits > 0 ? decimalSeparatorFor(locale) : '',
    fraction: (draft.fraction ?? '').slice(0, maxFractionDigits).padEnd(maxFractionDigits, '0'),
    typedFractionDigits: Math.min(draft.fraction?.length ?? 0, maxFractionDigits),
    isDecimalActive: draft.fraction !== null,
    suffix: formatted.slice(end),
  };
}

function digitSpan(formatted: string): { start: number; end: number } {
  let start = -1;
  let end = 0;

  for (let index = 0; index < formatted.length; index += 1) {
    if (formatted[index] !== undefined && /\d/.test(formatted[index] as string)) {
      if (start === -1) start = index;
      end = index + 1;
    }
  }

  return start === -1 ? { start: 0, end: formatted.length } : { start, end };
}

function decimalSeparatorFor(locale: string): string {
  const separator = new Intl.NumberFormat(locale).format(1.1).replace(/\d/g, '');

  return separator === '' ? '.' : separator;
}
