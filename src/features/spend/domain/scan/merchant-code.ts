import { parseEmvQr } from './emv/parse-emv-qr';

export type MerchantCode = {
  raw: string;
  merchantName: string;
  merchantCity: string;
  currency: string;
  country: string;
  isOneTime: boolean;
};

export function merchantCodeIn(raw: string): MerchantCode | undefined {
  const parsed = parseEmvQr(raw);
  if (parsed === undefined) return undefined;

  return {
    raw: parsed.raw,
    merchantName: parsed.merchantName,
    merchantCity: parsed.merchantCity,
    currency: parsed.currency ?? '',
    country: parsed.country ?? '',
    isOneTime: parsed.initiation === 'dynamic',
  };
}
