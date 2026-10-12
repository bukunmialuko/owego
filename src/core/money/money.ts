import { dinero, toDecimal, toSnapshot, type Dinero } from 'dinero.js';
import * as currencies from 'dinero.js/currencies';

export type Money = {
  readonly amount: Dinero<number>;
  readonly currency: CurrencyCode;
};

export type CurrencyCode = keyof typeof supportedCurrencies;

const supportedCurrencies = {
  USD: currencies.USD,
  GBP: currencies.GBP,
  NGN: currencies.NGN,
  XOF: currencies.XOF,
  KES: currencies.KES,
  VND: currencies.VND,
  PHP: currencies.PHP,
  KHR: currencies.KHR,
  IDR: currencies.IDR,
  THB: currencies.THB,
  BRL: currencies.BRL,
  ARS: currencies.ARS,
  COP: currencies.COP,
} as const;

const CURRENCY_SYMBOL: Record<CurrencyCode, string> = {
  USD: '$',
  GBP: '£',
  NGN: '₦',
  XOF: 'CFA',
  KES: 'KSh',
  VND: '₫',
  PHP: '₱',
  KHR: '៛',
  IDR: 'Rp',
  THB: '฿',
  BRL: 'R$',
  ARS: 'AR$',
  COP: 'COL$',
};

const API_MINOR_SCALE = 100;

export function isCurrencyCode(code: string): code is CurrencyCode {
  return Object.hasOwn(supportedCurrencies, code);
}

export function fractionDigitsFor(currency: CurrencyCode): number {
  return supportedCurrencies[currency].exponent;
}

export function fromDecimal(value: number | string, currency: CurrencyCode): Money {
  const definition = supportedCurrencies[currency];
  const scaled = Math.round(parseExact(value) * 10 ** definition.exponent);

  return {
    amount: dinero({ amount: scaled, currency: definition }),
    currency,
  };
}

export function formatMinor(
  amountMinor: number,
  currency: string,
  locale: string,
  fallback: CurrencyCode = 'USD',
): string {
  const code = isCurrencyCode(currency) ? currency : fallback;

  return format(fromDecimal(amountMinor / API_MINOR_SCALE, code), locale);
}

export function formatMinorTrimmed(
  amountMinor: number,
  currency: string,
  locale: string,
  fallback: CurrencyCode = 'USD',
): string {
  const code = isCurrencyCode(currency) ? currency : fallback;
  const fractionDigits = amountMinor % API_MINOR_SCALE === 0 ? 0 : 2;

  return formatCurrency(amountMinor / API_MINOR_SCALE, code, locale, fractionDigits);
}

export function formatMinorExact(
  amountMinor: number,
  currency: string,
  locale: string,
  { trim = false }: { trim?: boolean } = {},
): string {
  if (isCurrencyCode(currency)) {
    return trim
      ? formatMinorTrimmed(amountMinor, currency, locale)
      : formatMinor(amountMinor, currency, locale);
  }

  const fractionDigits = trim && amountMinor % API_MINOR_SCALE === 0 ? 0 : 2;
  const digits = { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits };
  const decimal = amountMinor / API_MINOR_SCALE;

  return /^[A-Z]{3}$/.test(currency)
    ? new Intl.NumberFormat(locale, { style: 'currency', currency, ...digits }).format(decimal)
    : `${new Intl.NumberFormat(locale, digits).format(decimal)} ${currency}`;
}

export function toDecimalNumber(money: Money): number {
  return Number(toDecimal(money.amount));
}

export function toApiMinor(money: Money): number {
  return Math.round(toDecimalNumber(money) * API_MINOR_SCALE);
}

export function fieldMinorToApi(minor: number, currency: CurrencyCode): number {
  return minor * fieldToApiFactor(currency);
}

export function apiMinorToField(apiMinor: number, currency: CurrencyCode): number {
  return Math.round(apiMinor / fieldToApiFactor(currency));
}

function fieldToApiFactor(currency: CurrencyCode): number {
  return API_MINOR_SCALE / 10 ** fractionDigitsFor(currency);
}

export function toApiDecimal(money: Money): number {
  return toDecimalNumber(money);
}

export function minorToDecimalString(minor: number): string {
  return unitsToDecimalString(minor, 2);
}

export function unitsToDecimalString(units: number, places: number): string {
  if (!Number.isSafeInteger(units) || units < 0) {
    throw new RangeError(`${String(units)} is not a whole, non-negative number of units.`);
  }

  const digits = String(units).padStart(places + 1, '0');
  const whole = digits.slice(0, -places).replace(/^0+(?=\d)/, '');
  const fraction = digits.slice(-places).replace(/0+$/, '');

  return fraction === '' ? whole : `${whole}.${fraction}`;
}

export function decimalToMinorFloor(decimal: string): number | undefined {
  return decimalToUnitsFloor(decimal, 2);
}

export function decimalToUnitsFloor(decimal: string, places: number): number | undefined {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(decimal);
  if (match === null) return undefined;

  const [, whole = '', fraction = ''] = match;
  const units = Number(`${whole}${fraction.slice(0, places).padEnd(places, '0')}`);

  return Number.isSafeInteger(units) ? units : undefined;
}

export function format(money: Money, locale: string): string {
  const { currency } = toSnapshot(money.amount);

  return formatCurrency(toDecimalNumber(money), money.currency, locale, currency.exponent);
}

export function formatCurrency(
  value: number,
  currency: CurrencyCode,
  locale: string,
  fractionDigits: number,
): string {
  const coded = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);

  const at = coded.indexOf(currency);
  if (at === -1) return coded;

  const symbol = CURRENCY_SYMBOL[currency];
  const before = coded.slice(0, at);
  const after = coded.slice(at + currency.length);
  const leadsTheNumber = !/\d/.test(before);
  const gap = /[A-Za-z]$/.test(symbol) ? '\u00a0' : '';

  return leadsTheNumber
    ? `${before}${symbol}${gap}${after.trimStart()}`
    : `${before}${symbol}${after}`;
}

export function isSameCurrency(a: Money, b: Money): boolean {
  return a.currency === b.currency;
}

export function compare(a: Money, b: Money): -1 | 0 | 1 {
  if (!isSameCurrency(a, b)) {
    throw new TypeError(`Cannot compare ${a.currency} with ${b.currency}: same currency required.`);
  }

  const left = toApiMinor(a);
  const right = toApiMinor(b);

  if (left < right) return -1;
  return left > right ? 1 : 0;
}

function parseExact(value: number | string): number {
  if (typeof value === 'number') return value;

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new TypeError(`"${value}" is not a decimal amount.`);
  }

  return parsed;
}

export function splitAmount(formatted: string): { major: string; minor: string } {
  const separator = /[.,](?=\d{1,2}\D*$)/.exec(formatted);

  if (separator?.index === undefined) return { major: formatted, minor: '' };

  return {
    major: formatted.slice(0, separator.index),
    minor: formatted.slice(separator.index),
  };
}

export function formatDeltaPercent(percent: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    signDisplay: 'exceptZero',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(percent / 100);
}
