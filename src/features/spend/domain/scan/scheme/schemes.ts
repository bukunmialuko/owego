export type SchemeId =
  | 'tanqr'
  | 'ke-qr'
  | 'pix'
  | 'py-qr'
  | 'bre-b'
  | 'qrph'
  | 'promptpay'
  | 'vietqr'
  | 'vnpayqr'
  | 'khqr';

type SchemeRule =
  | { readonly guid: string }
  | { readonly guidPrefix: string }
  | { readonly guidPattern: RegExp; readonly tags: readonly string[] };

export type Scheme = {
  readonly id: SchemeId;
  readonly country: string;
  readonly rule: SchemeRule;
  readonly remoteAmountSubTag?: string;
};

export const SCHEMES: readonly Scheme[] = [
  { id: 'tanqr', country: 'TZ', rule: { guid: 'tz.go.bot.tips' } },
  { id: 'ke-qr', country: 'KE', rule: { guid: 'ke.go.qr' } },
  { id: 'pix', country: 'BR', rule: { guid: 'br.gov.bcb.pix' }, remoteAmountSubTag: '25' },
  { id: 'py-qr', country: 'PY', rule: { guidPrefix: 'py.' } },
  { id: 'bre-b', country: 'CO', rule: { guidPrefix: 'co.com.' } },
  { id: 'qrph', country: 'PH', rule: { guid: 'ph.instapay.me' } },
  { id: 'promptpay', country: 'TH', rule: { guidPrefix: 'a000000677' } },
  { id: 'vietqr', country: 'VN', rule: { guidPrefix: 'a000000727' } },
  { id: 'vnpayqr', country: 'VN', rule: { guidPrefix: 'a000000775' } },
  {
    id: 'khqr',
    country: 'KH',
    rule: { guidPattern: /^[a-z0-9_.-]+@[a-z0-9]+$/, tags: ['29', '30'] },
  },
];

export const FALLBACK_COUNTRIES: readonly string[] = [
  'TZ',
  'KE',
  'UG',
  'ZA',
  'GH',
  'NG',
  'ZM',
  'BR',
  'AR',
  'CO',
  'PE',
  'PY',
  'TH',
  'VN',
  'PH',
  'KH',
];

export function matchesRule(rule: SchemeRule, guid: string, tag: string): boolean {
  const lowered = guid.toLowerCase();

  if ('guid' in rule) return lowered === rule.guid;
  if ('guidPrefix' in rule) return lowered.startsWith(rule.guidPrefix);

  return rule.tags.includes(tag) && rule.guidPattern.test(lowered);
}
