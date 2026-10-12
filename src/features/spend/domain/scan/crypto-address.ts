export type CryptoAddressReading =
  | {
      kind: 'address';
      address: string;
      networkCode: string | undefined;
    }
  | { kind: 'unsupportedChain' }
  | { kind: 'none' };

const SUPPORTED_SCHEMES: Readonly<Record<string, string | undefined>> = {
  'ethereum:': undefined,
  'solana:': 'SOL',
};

const UNSUPPORTED_SCHEMES = ['bitcoin:', 'litecoin:', 'dogecoin:', 'bitcoincash:'];

const EVM = /^0x[0-9a-fA-F]{40}$/;

const OPAQUE_TOKEN = /^[a-zA-Z0-9]{26,62}$/;

const CALLS_A_CONTRACT = '/';

const CHAIN_SUFFIX = /@\w+$/;

export function cryptoAddressFrom(raw: string): CryptoAddressReading {
  const trimmed = raw.trim();
  const lowered = trimmed.toLowerCase();

  if (UNSUPPORTED_SCHEMES.some((scheme) => lowered.startsWith(scheme))) {
    return { kind: 'unsupportedChain' };
  }

  const scheme = Object.keys(SUPPORTED_SCHEMES).find((candidate) => lowered.startsWith(candidate));
  const hint = scheme === undefined ? undefined : SUPPORTED_SCHEMES[scheme];

  const withoutScheme = scheme === undefined ? trimmed : trimmed.slice(scheme.length);
  const [beforeQuery = ''] = withoutScheme.split('?');
  const candidate = beforeQuery.trim();

  if (candidate.includes(CALLS_A_CONTRACT)) return { kind: 'none' };

  const address = candidate.replace(CHAIN_SUFFIX, '');

  if (address.toLowerCase().startsWith('0x')) {
    return EVM.test(address) ? { kind: 'address', address, networkCode: hint } : { kind: 'none' };
  }

  if (!OPAQUE_TOKEN.test(address)) return { kind: 'none' };

  return { kind: 'address', address, networkCode: hint };
}
