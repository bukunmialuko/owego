import { cryptoAddressFrom } from './crypto-address';
import { nigerianAccountFrom } from './nigerian-account';
import { parseEmvQr } from './emv/parse-emv-qr';
import { phoneNumberFrom } from './phone-number';
import { identifyScheme } from './scheme/identify-scheme';
import type { PaymentIdentifier } from './payment-identifier';

const MERCHANT_CODE_PREFIX = '0002';

export function classifyDetection(raw: string): PaymentIdentifier {
  const parsed = parseEmvQr(raw);
  if (parsed !== undefined) {
    return { kind: 'merchantQr', parsed, scheme: identifyScheme(parsed) };
  }

  const address = cryptoAddressFrom(raw);
  if (address.kind === 'address') {
    return { kind: 'cryptoAddress', address: address.address, networkCode: address.networkCode };
  }
  if (address.kind === 'unsupportedChain') {
    return { kind: 'unknown', reason: 'unsupportedChain' };
  }

  const phoneNumber = phoneNumberFrom(raw);
  if (phoneNumber !== undefined) {
    return { kind: 'phoneNumber', ...phoneNumber };
  }

  const accountNumber = nigerianAccountFrom(raw);
  if (accountNumber !== undefined) {
    return { kind: 'nigerianAccount', accountNumber };
  }

  return {
    kind: 'unknown',
    reason: raw.trim().startsWith(MERCHANT_CODE_PREFIX) ? 'malformedQr' : 'unknownCode',
  };
}
