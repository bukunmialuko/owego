import type { Beneficiary } from '../entity/beneficiary';
import { PaymentMethodCode } from '../entity/beneficiary-form';
import { zelleCategoryOf } from '../corridor/usd-zelle';
import {
  digitsOnly,
  nationalDigits,
  normalizeRecipientText,
  tokenizeRecipientText,
} from './recipient-text';

export const SEARCH_RESULT_CAP = 50;

const MIN_SUBSCRIBER_DIGITS = 9;

const MIN_SUFFIX_DIGITS = 7;

type IndexedBeneficiary = {
  beneficiary: Beneficiary;
  normalizedName: string;
  nameTokens: readonly string[];
  normalizedInstitutions: readonly string[];
  lowerAccount: string;
  accountDigits: string;
  nationalDigits: string;
  sortEpoch: number;
  dedupeKey: string;
};

const INDEXED = new WeakMap<Beneficiary, IndexedBeneficiary>();

type Projection = {
  holder: string;
  institutions: readonly string[];
  dedupeInstitution: string;
  accountNumber: string;
  bankCode: string;
  isAddress: boolean;
  isSearchable: boolean;
};

function projectionOf(beneficiary: Beneficiary): Projection {
  switch (beneficiary.kind) {
    case 'bank': {
      const { accountHolder, bankName, bankCode, accountNumber } = beneficiary.fields;
      return {
        holder: accountHolder.trim() === '' ? beneficiary.name : accountHolder,
        institutions: [bankName],
        dedupeInstitution: bankName,
        accountNumber,
        bankCode:
          beneficiary.corridor?.method === PaymentMethodCode.Zelle
            ? (zelleCategoryOf(bankCode) ?? bankCode)
            : bankCode,
        isAddress: false,
        isSearchable: true,
      };
    }
    case 'wallet':
      return {
        holder: beneficiary.tag,
        institutions: [beneficiary.networkCode, beneficiary.networkName],
        dedupeInstitution: beneficiary.networkCode,
        accountNumber: beneficiary.address,
        bankCode: '',
        isAddress: true,
        isSearchable: true,
      };
    case 'merchant':
      return {
        holder: beneficiary.merchantName,
        institutions: [beneficiary.currency],
        dedupeInstitution: MERCHANT_INSTITUTION,
        accountNumber: beneficiary.qrString,
        bankCode: '',
        isAddress: true,
        isSearchable: false,
      };
  }
}

const MERCHANT_INSTITUTION = 'merchant qr';

export function destinationKeyOf(beneficiary: Beneficiary): string {
  return dedupeKeyOf(beneficiary.id, projectionOf(beneficiary));
}

function dedupeKeyOf(
  id: string,
  { accountNumber, bankCode, dedupeInstitution, isAddress }: Projection,
): string {
  const account = accountKeyOf(accountNumber, isAddress);

  if (account === '') return `id:${id}`;

  const institution =
    bankCode !== '' ? bankCode.toLowerCase() : normalizeRecipientText(dedupeInstitution);
  return `${account}|${institution}`;
}

const NUMERIC_IDENTIFIER = /^[\d\s().+-]+$/;

function accountKeyOf(accountNumber: string, isAddress: boolean): string {
  const trimmed = accountNumber.trim();

  if (NUMERIC_IDENTIFIER.test(trimmed)) return digitsOnly(trimmed);

  return isAddress ? trimmed : normalizeRecipientText(trimmed);
}

function epochOf({ updatedAt, createdAt }: Beneficiary): number {
  const epoch = Date.parse(updatedAt !== '' ? updatedAt : createdAt);
  return Number.isNaN(epoch) ? 0 : epoch;
}

function indexedFor(beneficiary: Beneficiary): IndexedBeneficiary {
  const cached = INDEXED.get(beneficiary);
  if (cached !== undefined) return cached;

  const projection = projectionOf(beneficiary);
  const searchableAccount = projection.isSearchable ? projection.accountNumber : '';
  const accountDigits = digitsOnly(searchableAccount);
  const indexed: IndexedBeneficiary = {
    beneficiary,
    normalizedName: normalizeRecipientText(projection.holder),
    nameTokens: tokenizeRecipientText(projection.holder),
    normalizedInstitutions: projection.institutions.map(normalizeRecipientText),
    lowerAccount: normalizeRecipientText(searchableAccount),
    accountDigits,
    nationalDigits: nationalDigits(accountDigits),
    sortEpoch: epochOf(beneficiary),
    dedupeKey: dedupeKeyOf(beneficiary.id, projection),
  };
  INDEXED.set(beneficiary, indexed);
  return indexed;
}

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function byRecencyThenName(a: IndexedBeneficiary, b: IndexedBeneficiary): number {
  return b.sortEpoch - a.sortEpoch || compareText(a.normalizedName, b.normalizedName);
}

function sameSubscriberNumber(entryDigits: string, queryDigits: string): boolean {
  if (entryDigits === '' || queryDigits === '') return false;

  const query = nationalDigits(queryDigits);
  const shorter = entryDigits.length <= query.length ? entryDigits : query;
  if (shorter.length < MIN_SUBSCRIBER_DIGITS) return false;

  return entryDigits.endsWith(query) || query.endsWith(entryDigits);
}

function allTokensPrefixMatch(nameTokens: readonly string[], queryTokens: readonly string[]) {
  if (nameTokens.length === 0) return false;

  const available = [...nameTokens];
  for (const token of queryTokens) {
    const match = available.findIndex((name) => name.startsWith(token));
    if (match === -1) return false;
    available.splice(match, 1);
  }
  return true;
}

function rankOf(
  entry: IndexedBeneficiary,
  normalizedQuery: string,
  queryTokens: readonly string[],
  queryDigits: string,
): number | undefined {
  const { accountDigits, lowerAccount } = entry;

  if (queryDigits !== '' && accountDigits === queryDigits) return 0;
  if (lowerAccount !== '' && lowerAccount === normalizedQuery) return 0;
  if (sameSubscriberNumber(entry.nationalDigits, queryDigits)) return 0;

  if (queryDigits !== '' && accountDigits.startsWith(queryDigits)) return 1;
  if (lowerAccount.startsWith(normalizedQuery)) return 1;
  if (queryDigits.length >= MIN_SUFFIX_DIGITS && accountDigits.endsWith(queryDigits)) return 1;
  if (normalizedQuery.length >= MIN_SUFFIX_DIGITS && lowerAccount.endsWith(normalizedQuery)) {
    return 1;
  }

  if (queryTokens.length > 0 && allTokensPrefixMatch(entry.nameTokens, queryTokens)) {
    const [leadingName] = entry.nameTokens;
    const [leadingQuery = ''] = queryTokens;
    return leadingName?.startsWith(leadingQuery) === true ? 2 : 3;
  }

  if (queryDigits !== '' && accountDigits.includes(queryDigits)) return 4;
  if (lowerAccount.includes(normalizedQuery)) return 4;

  if (entry.normalizedName.includes(normalizedQuery)) return 5;

  if (entry.normalizedInstitutions.some((name) => name.includes(normalizedQuery))) return 6;

  return undefined;
}

type SearchOptions = {
  dedupe?: boolean;
  limit?: number;
};

export function searchBeneficiaries(
  beneficiaries: readonly Beneficiary[],
  query: string,
  { dedupe = true, limit }: SearchOptions = {},
): Beneficiary[] {
  const byRecency = beneficiaries
    .map((beneficiary, arrival) => ({ entry: indexedFor(beneficiary), arrival }))
    .sort((a, b) => byRecencyThenName(a.entry, b.entry) || a.arrival - b.arrival)
    .map(({ entry }) => entry);

  const normalizedQuery = normalizeRecipientText(query);
  const ranked =
    normalizedQuery === '' ? byRecency : rankedMatches(byRecency, normalizedQuery, query);

  const seen = new Set<string>();
  const results: Beneficiary[] = [];
  for (const entry of ranked) {
    if (limit !== undefined && results.length >= limit) break;
    if (dedupe && seen.has(entry.dedupeKey)) continue;
    seen.add(entry.dedupeKey);
    results.push(entry.beneficiary);
  }
  return results;
}

function rankedMatches(
  byRecency: readonly IndexedBeneficiary[],
  normalizedQuery: string,
  query: string,
): IndexedBeneficiary[] {
  const queryTokens = normalizedQuery.split(' ').filter((token) => token !== '');
  const queryDigits = digitsOnly(query);

  return byRecency
    .flatMap((entry, recency) => {
      const rank = rankOf(entry, normalizedQuery, queryTokens, queryDigits);
      return rank === undefined ? [] : [{ entry, rank, recency }];
    })
    .sort((a, b) => a.rank - b.rank || a.recency - b.recency)
    .map(({ entry }) => entry);
}
