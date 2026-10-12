import type { EmvMerchantAccount, ParsedEmvQr } from '../emv/parse-emv-qr';
import { FALLBACK_COUNTRIES, matchesRule, SCHEMES, type SchemeId } from './schemes';

export type SchemeIdentification =
  | {
      kind: 'scheme';
      id: SchemeId;
      country: string;
      amountSource: 'inline' | 'remote';
    }
  | { kind: 'country'; country: string }
  | { kind: 'cardOnly' }
  | { kind: 'unknown' };

export function identifyScheme(parsed: ParsedEmvQr): SchemeIdentification {
  for (const scheme of SCHEMES) {
    const account = parsed.merchantAccounts.find((candidate) =>
      matchesRule(scheme.rule, candidate.guid, candidate.tag),
    );

    if (account !== undefined) {
      return {
        kind: 'scheme',
        id: scheme.id,
        country: scheme.country,
        amountSource: amountSourceOf(scheme.remoteAmountSubTag, account),
      };
    }
  }

  const carriesCardSlot = Object.keys(parsed.cardSchemeBlocks).length > 0;
  if (parsed.merchantAccounts.length === 0 && carriesCardSlot) return { kind: 'cardOnly' };

  const scanned = (parsed.country ?? '').toLowerCase();
  const country = FALLBACK_COUNTRIES.find((candidate) => candidate.toLowerCase() === scanned);
  if (country !== undefined) return { kind: 'country', country };

  return { kind: 'unknown' };
}

function amountSourceOf(
  remoteAmountSubTag: string | undefined,
  account: EmvMerchantAccount,
): 'inline' | 'remote' {
  if (remoteAmountSubTag === undefined) return 'inline';

  return account.subTags[remoteAmountSubTag] === undefined ? 'inline' : 'remote';
}
