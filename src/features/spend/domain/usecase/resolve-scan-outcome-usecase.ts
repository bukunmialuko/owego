import { fractionDigitsFor, isCurrencyCode } from '@/core/money/money';
import type { CurrencyDto } from '@/core/reference-data/reference-data';
import { PaymentMethodCode } from '../entity/beneficiary-form';
import { corridorFor, payoutCurrencies } from '../corridor/registry';
import { ngnBankTransfer } from '../corridor/ngn-bank-transfer';
import { classifyDetection } from '../scan/classify-detection';
import { toPayoutRecipient } from '../corridor/to-payout-recipient';
import type { CapturedAccount } from '../entity/captured-account';
import type { ParsedEmvQr } from '../scan/emv/parse-emv-qr';
import type { SchemeIdentification } from '../scan/scheme/identify-scheme';
import type { ScanOutcome } from '../scan/scan-outcome';

const API_MINOR_SCALE = 2;

const AMOUNT = /^(\d{1,10})(?:\.(\d{1,2}))?$/;

export function resolveScanOutcome(
  raw: string,
  currencies: readonly CurrencyDto[] = payoutCurrencies(),
): ScanOutcome {
  const detected = classifyDetection(raw);

  switch (detected.kind) {
    case 'merchantQr':
      return merchantOutcome(detected.parsed, detected.scheme, currencies);

    case 'cryptoAddress':
      return {
        kind: 'prefillAddress',
        address: detected.address,
        networkCode: detected.networkCode,
      };

    case 'phoneNumber':
      return prefillOutcome(
        currencies.find((entry) => entry.country_code === detected.countryCode),
        { phoneNumber: detected.e164 },
      );

    case 'nigerianAccount':
      return prefillOutcome(
        currencies.find((entry) => entry.code === ngnBankTransfer.currency),
        { accountNumber: detected.accountNumber },
      );

    case 'unknown':
      return { kind: 'unsupported', reason: detected.reason };
  }
}

export function resolveCapturedAccount(
  account: CapturedAccount,
  currencies: readonly CurrencyDto[] = payoutCurrencies(),
): ScanOutcome {
  const naira = currencies.find((entry) => entry.code === ngnBankTransfer.currency);
  if (naira === undefined) return { kind: 'unsupported', reason: 'corridorUnavailable' };

  const recipient = toPayoutRecipient(
    ngnBankTransfer,
    {
      bankCode: account.bankCode,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
    },
    naira,
    (name) => (name === 'bankCode' ? account.bankName : name),
  );

  return { kind: 'account', recipient, isVerified: account.isVerified };
}

function merchantOutcome(
  parsed: ParsedEmvQr,
  scheme: SchemeIdentification,
  currencies: readonly CurrencyDto[],
): ScanOutcome {
  if (scheme.kind === 'cardOnly') return { kind: 'unsupported', reason: 'cardSchemeQr' };

  const currency = currencyOf(parsed, currencies);
  if (currency === undefined) return { kind: 'unsupported', reason: 'currencyNotOffered' };

  const amountMinor = minorUnitsOf(parsed.amount, currency.code);
  if (amountMinor === 'unreadable') return { kind: 'unsupported', reason: 'malformedQr' };

  if (currency.coming_soon) {
    return { kind: 'unsupported', reason: 'comingSoon', currencyName: currency.name };
  }

  if (scheme.kind === 'scheme' && scheme.amountSource === 'remote') {
    return { kind: 'unsupported', reason: 'remoteAmount' };
  }

  const corridor = corridorFor(currency.code, PaymentMethodCode.Crypto);
  if (corridor === undefined || !corridor.payable) {
    return { kind: 'unsupported', reason: 'corridorUnavailable' };
  }

  return {
    kind: 'merchant',
    amountMinor,
    qrString: parsed.raw,
    recipient: toPayoutRecipient(
      corridor,
      { qrString: parsed.raw, merchantName: parsed.merchantName },
      currency,
      (name) => name,
    ),
  };
}

function currencyOf(
  parsed: ParsedEmvQr,
  currencies: readonly CurrencyDto[],
): CurrencyDto | undefined {
  if (parsed.currency !== undefined) {
    return currencies.find((entry) => entry.code === parsed.currency);
  }

  return currencies.find((entry) => entry.country_code === parsed.country);
}

function minorUnitsOf(amount: string | undefined, code: string): number | undefined | 'unreadable' {
  if (amount === undefined) return undefined;

  const match = AMOUNT.exec(amount);
  if (match === null) return 'unreadable';

  const [, whole = '', fraction = ''] = match;

  if (isCurrencyCode(code) && fraction.length > fractionDigitsFor(code)) return 'unreadable';

  const minor =
    Number(whole) * 10 ** API_MINOR_SCALE + Number(fraction.padEnd(API_MINOR_SCALE, '0'));

  return minor === 0 ? undefined : minor;
}

function prefillOutcome(
  currency: CurrencyDto | undefined,
  values: Record<string, string>,
): ScanOutcome {
  if (currency === undefined) return { kind: 'unsupported', reason: 'corridorUnavailable' };

  return { kind: 'prefillRecipient', currency: currency.code, values };
}
