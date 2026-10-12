import { currencyFixture, type CurrencyDto } from '@/core/reference-data/reference-data';
import type { PaymentMethodCode } from '../entity/beneficiary-form';
import { cryptoWallet } from './crypto';
import { kesMobileMoney, xofMobileMoney } from './mobile-money';
import { qrCorridor } from './qr';
import { ngnBankTransfer } from './ngn-bank-transfer';
import { usdAch, usdSwift } from './unpayable';
import { usdZelle } from './usd-zelle';
import { RailCode, type CorridorSpec } from './corridor-spec';

const SCAN_CURRENCIES = ['VND', 'PHP', 'KHR', 'IDR', 'THB', 'BRL', 'ARS', 'COP'];

const CORRIDORS: readonly CorridorSpec[] = [
  ngnBankTransfer,
  kesMobileMoney,
  xofMobileMoney,
  usdZelle,
  usdAch,
  usdSwift,
  cryptoWallet,
  ...SCAN_CURRENCIES.map(qrCorridor),
];

const BY_KEY = new Map(CORRIDORS.map((spec) => [keyOf(spec.currency, spec.method), spec]));

function keyOf(currency: string, method: PaymentMethodCode): string {
  return `${currency}:${method}`;
}

export function corridorFor(currency: string, method: PaymentMethodCode): CorridorSpec | undefined {
  return BY_KEY.get(keyOf(currency, method));
}

export function corridorNamed(currency: string, method: string): CorridorSpec | undefined {
  return CORRIDORS.find((spec) => spec.currency === currency && spec.method === method);
}

export function corridorsFor(currency: string): readonly CorridorSpec[] {
  return CORRIDORS.filter((spec) => spec.currency === currency).sort(
    (left, right) => Number(right.payable) - Number(left.payable),
  );
}

export function isPayableByForm(currency: CurrencyDto): boolean {
  return corridorsFor(currency.code).some((spec) => spec.payable && spec.entry === 'form');
}

export function isPayableByScan(currency: CurrencyDto): boolean {
  return corridorsFor(currency.code).some((spec) => spec.payable && spec.entry === 'scan');
}

export function allCorridors(): readonly CorridorSpec[] {
  return CORRIDORS;
}

export function beneficiaryCorridorsFor(currency: string): readonly CorridorSpec[] {
  return corridorsFor(currency)
    .filter((spec) => spec.beneficiary !== undefined)
    .sort(
      (left, right) =>
        Number(right.beneficiary?.saveable ?? false) - Number(left.beneficiary?.saveable ?? false),
    );
}

export function savableCorridors(): readonly CorridorSpec[] {
  return CORRIDORS.filter((spec) => spec.beneficiary?.saveable === true);
}

export function isSaveableByForm(currency: CurrencyDto): boolean {
  return beneficiaryCorridorsFor(currency.code).some(
    (spec) => spec.beneficiary?.saveable === true && spec.rail !== RailCode.Wallet,
  );
}

export function walletBeneficiaryCorridor(): CorridorSpec {
  return cryptoWallet;
}

export function payoutCurrencies(): readonly CurrencyDto[] {
  const parsed = currencyFixture.read();

  return parsed.ok ? parsed.value : [];
}
