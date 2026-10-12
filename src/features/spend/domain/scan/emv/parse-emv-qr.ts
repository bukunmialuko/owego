import { alphaFromNumeric } from './iso4217-numeric';
import { crc16CcittFalse } from './crc16';

export type EmvMerchantAccount = {
  tag: string;
  guid: string;
  subTags: Readonly<Record<string, string>>;
};

export type ParsedEmvQr = {
  raw: string;
  tags: Readonly<Record<string, string>>;
  merchantAccounts: readonly EmvMerchantAccount[];
  cardSchemeBlocks: Readonly<Record<string, string>>;
  initiation: 'static' | 'dynamic' | undefined;
  amount: string | undefined;
  currency: string | undefined;
  currencyNumeric: string | undefined;
  country: string | undefined;
  merchantName: string;
  merchantCity: string;
  crcValid: boolean;
};

const TAG = {
  payloadFormat: '00',
  initiation: '01',
  currency: '53',
  amount: '54',
  country: '58',
  merchantName: '59',
  merchantCity: '60',
  crc: '63',
} as const;

const MERCHANT_ACCOUNT_RANGES = [
  { from: 26, to: 51 },
  { from: 80, to: 99 },
];

const CARD_SCHEME_RANGE = { from: 2, to: 25 };

const MAX_LENGTH = 4296;

const HEADER_LENGTH = 4;

type Tlv = { tag: string; value: string };

export function parseEmvQr(raw: string): ParsedEmvQr | undefined {
  const payload = raw.trim();

  if (payload.length > MAX_LENGTH || !payload.startsWith('0002')) return undefined;

  const triples = tokenise(payload);
  if (triples === undefined) return undefined;

  const tags: Record<string, string> = {};
  for (const { tag, value } of triples) tags[tag] = value;

  if (tags[TAG.payloadFormat] === undefined || tags[TAG.crc] === undefined) return undefined;

  const currencyNumeric = tags[TAG.currency];

  return {
    raw: payload,
    tags,
    merchantAccounts: triples.filter(isMerchantAccount).map(toMerchantAccount),
    cardSchemeBlocks: Object.fromEntries(
      triples.filter(isCardSchemeBlock).map(({ tag, value }) => [tag, value]),
    ),
    initiation: initiationOf(tags[TAG.initiation]),
    amount: tags[TAG.amount],
    currency: currencyNumeric === undefined ? undefined : alphaFromNumeric(currencyNumeric),
    currencyNumeric,
    country: tags[TAG.country],
    merchantName: tags[TAG.merchantName] ?? '',
    merchantCity: tags[TAG.merchantCity] ?? '',
    crcValid: isCrcValid(payload, tags[TAG.crc]),
  };
}

function tokenise(data: string): Tlv[] | undefined {
  const triples: Tlv[] = [];
  let cursor = 0;

  while (cursor < data.length) {
    if (cursor + HEADER_LENGTH > data.length) return undefined;

    const tag = data.slice(cursor, cursor + 2);
    const declared = data.slice(cursor + 2, cursor + HEADER_LENGTH);
    if (!/^\d{2}$/.test(declared)) return undefined;

    const length = Number(declared);
    const start = cursor + HEADER_LENGTH;
    const end = start + length;
    if (end > data.length) return undefined;

    triples.push({ tag, value: data.slice(start, end) });
    cursor = end;
  }

  return triples;
}

function inRange({ tag }: Tlv, range: { from: number; to: number }): boolean {
  return Number(tag) >= range.from && Number(tag) <= range.to;
}

function isMerchantAccount(triple: Tlv): boolean {
  return MERCHANT_ACCOUNT_RANGES.some((range) => inRange(triple, range));
}

function isCardSchemeBlock(triple: Tlv): boolean {
  return inRange(triple, CARD_SCHEME_RANGE);
}

function toMerchantAccount({ tag, value }: Tlv): EmvMerchantAccount {
  const nested = tokenise(value) ?? [];
  const subTags = Object.fromEntries(nested.map((triple) => [triple.tag, triple.value]));

  return { tag, guid: subTags['00'] ?? '', subTags };
}

function initiationOf(value: string | undefined): 'static' | 'dynamic' | undefined {
  if (value === '11') return 'static';
  if (value === '12') return 'dynamic';

  return undefined;
}

function isCrcValid(payload: string, declared: string | undefined): boolean {
  if (declared === undefined || declared.length !== 4) return false;

  const marker = payload.lastIndexOf('6304');
  if (marker === -1) return false;

  return crc16CcittFalse(payload.slice(0, marker + 4)).toLowerCase() === declared.toLowerCase();
}
